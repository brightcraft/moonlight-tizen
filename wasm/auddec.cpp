#include "moonlight_wasm.hpp"

#include <chrono>

#include <emscripten.h>

#include "samsung/wasm/elementary_media_packet.h"

using std::chrono_literals::operator""s;
using std::chrono_literals::operator""ms;
using TimeStamp = samsung::wasm::Seconds;

#define MAX_CHANNEL_COUNT 8
#define FRAME_SIZE 240

static constexpr TimeStamp kAudioBufferMargin = 100ms;

// Number of decoded frames kept in the Web Audio slot pool. Frames are handed to the main
// thread by pointer, so a slot must stay untouched long enough for the scheduler to read it.
static constexpr int kAudioSlotCount = 32;

// Largest decoded frame the Web Audio slot pool can hold. The RTSP negotiation never asks for
// more than 10 ms of audio per packet, which is 480 samples for each of the 8 possible channels.
static constexpr size_t kAudioSlotElements = 480 * MAX_CHANNEL_COUNT;

// Jitter buffer target used by the Web Audio backend when the user has not selected one
static constexpr int kDefaultAudioJitterMs = 100;

static std::vector<opus_int16> s_DecodeBuffer;

static TimeStamp s_frameDuration;
static TimeStamp s_pktPts;
static TimeStamp s_estimatedAudioEnd;

static size_t s_samplesPerFrame;
static size_t s_channelCount;
static int s_sampleRate;

static std::chrono::time_point<std::chrono::steady_clock> s_firstAppend;

static bool s_hasFirstFrame = false;
static bool s_AudioSyncEnabled = false;

// Audio backend rendering the stream, latched when the audio stream is initialized so that
// the decoding callbacks cannot observe a backend change made while a stream is running
static AudioBackend s_AudioBackend = AudioBackend::Emss;

// Rotating pool of decoded frames for the Web Audio backend. This is statically allocated
// because the scheduler on the main thread reads a slot asynchronously, so the memory must
// stay valid for the lifetime of the application rather than that of a streaming session.
static opus_int16 s_AudioSlots[kAudioSlotCount][kAudioSlotElements];
static int s_AudioSlotIndex = 0;

static inline TimeStamp FrameDuration(double samplesPerFrame, double sampleRate) {
  // Calculate the duration of a frame based on the number of samples per frame and the sample rate
  return TimeStamp(samplesPerFrame / sampleRate);
}

static void DecodeAndAppendPacket(samsung::wasm::ElementaryMediaTrack* track, samsung::wasm::SessionId session_id,
  OpusMSDecoder* decoder, const unsigned char* sampleData, int sampleLength) {
  int decodeLen;
  
  // Decode the incoming audio packet using Opus decoder
  decodeLen = opus_multistream_decode(
    decoder, sampleData, sampleLength,
    s_DecodeBuffer.data(), s_samplesPerFrame, 0
  );

  // Check if audio decoding failed
  if (decodeLen <= 0) {
    // Reset the buffer contents to zero when decoding fails
    s_DecodeBuffer.assign(s_DecodeBuffer.size(), 0);
    return;
  }

  // Calculate desired buffer size in bytes for decoded audio data
  size_t s_desiredBufferSize = sizeof(opus_int16) * decodeLen * s_channelCount;

  // Create an ElementaryMediaPacket and start decoding with the decoded audio data
  samsung::wasm::ElementaryMediaPacket pkt {
    s_pktPts, // presentation timestamp
    s_pktPts, // decoding timestamp
    s_frameDuration, // packet duration
    true, // bool value indicating if packet is a keyframe
    s_desiredBufferSize, // packet size
    s_DecodeBuffer.data(), // pointer to packet payload
    0, 0, 0, 1, // packet of width, height, framerate numerator and framerate denominator
    session_id // session identifier
  };

  // Attempt to append the packet to the audio track for rendering
  if (track->AppendPacket(pkt)) {
    // If successful, update the presentation timestamp for the next packet
    s_pktPts += s_frameDuration;
  } else {
    MoonlightInstance::ClLogMessage("Append audio packet failed\n");
  }

  // Resize decode buffer if it's smaller than the desired size
  if (s_desiredBufferSize > s_DecodeBuffer.size()) {
    s_DecodeBuffer.resize(s_desiredBufferSize);
  }
}

static void DecodeAndScheduleFrame(OpusMSDecoder* decoder, const unsigned char* sampleData, int sampleLength) {
  // Check if the Opus decoder failed to be created for this streaming session
  if (!decoder) {
    return;
  }

  // Take the next slot of the pool so the scheduler still has time to read the previous ones
  opus_int16* slot = s_AudioSlots[s_AudioSlotIndex];

  // Decode the incoming audio packet using Opus decoder
  int decodeLen = opus_multistream_decode(
    decoder, sampleData, sampleLength,
    slot, s_samplesPerFrame, 0
  );

  // Check if audio decoding failed
  if (decodeLen <= 0) {
    return;
  }

  // Advance to the next slot only once a frame was written, so a failed decode does not
  // consume the protection window that the already scheduled frames rely on
  s_AudioSlotIndex = (s_AudioSlotIndex + 1) % kAudioSlotCount;

  // Hand the decoded samples to the audio scheduler running on the main thread. This is
  // asynchronous, so the audio thread is never blocked waiting on the browser event loop.
  MAIN_THREAD_ASYNC_EM_ASM({
    if (typeof _audReceiveFrame === 'function') {
      _audReceiveFrame($0, $1, $2, $3);
    }
  }, (int)(size_t)slot, decodeLen, (int)s_channelCount, s_sampleRate);
}

int MoonlightInstance::AudDecInit(int audioConfiguration, POPUS_MULTISTREAM_CONFIGURATION opusConfig, void* context, int arFlags) {
  int rc;

  ClLogMessage("MoonlightInstance::AudDecInit\n");

  // Latch the audio backend selected for this streaming session
  s_AudioBackend = g_Instance->m_AudioBackend;

  // Initialize packet timestamp to zero
  s_pktPts = 0s;

  // Initialize samples per frame (240 or 480), channels count (2, 6, 8) and sample rate (48000)
  s_samplesPerFrame = opusConfig->samplesPerFrame;
  s_channelCount = opusConfig->channelCount;
  s_sampleRate = opusConfig->sampleRate;

  // Calculate buffer size in bytes for one decoded audio frame
  size_t s_bufferSize = sizeof(opus_int16) * s_samplesPerFrame * s_channelCount;

  // Resize the decode buffer based on the samples per frame and channels count
  s_DecodeBuffer.resize(s_bufferSize);

  // Calculate the frame duration based on the samples per frame (240) and sample rate (48000)
  s_frameDuration = FrameDuration(opusConfig->samplesPerFrame, opusConfig->sampleRate);

  // Create the Opus decoder with the provided configuration parameters
  g_Instance->m_OpusDecoder = opus_multistream_decoder_create(
    opusConfig->sampleRate, opusConfig->channelCount,
    opusConfig->streams, opusConfig->coupledStreams,
    opusConfig->mapping, &rc
  );

  // Initialize the estimated audio end time
  s_estimatedAudioEnd = 0s;

  // Flag indicating whether this is the first frame of audio to be decoded
  s_hasFirstFrame = false;

  // Set the audio synchronization flag based on instance configuration
  s_AudioSyncEnabled = g_Instance->m_AudioSyncEnabled;

  // Prepare the audio scheduler when the Web Audio backend is selected
  if (s_AudioBackend == AudioBackend::WebAudio) {
    // Refuse to stream audio that cannot fit in a slot of the pool, as writing a larger
    // frame would corrupt the neighboring slots that are waiting to be scheduled
    if (s_samplesPerFrame * s_channelCount > kAudioSlotElements) {
      ClLogMessage("Decoded audio frame of %d samples is too large for the Web Audio backend!\n",
        (int)(s_samplesPerFrame * s_channelCount));
      return -1;
    }

    // Start writing decoded frames at the beginning of the slot pool
    s_AudioSlotIndex = 0;

    // Select the jitter buffer target requested by the user, or the default one when unset
    int audioJitterMs = g_Instance->m_AudioJitterMs > 0 ? g_Instance->m_AudioJitterMs : kDefaultAudioJitterMs;
    ClLogMessage("Selected the Web Audio backend with a jitter buffer of %d ms\n", audioJitterMs);

    // Publish the jitter buffer target to the audio scheduler in platform/audio.js
    MAIN_THREAD_ASYNC_EM_ASM({
      window._mlAudioTargetMs = $0;
    }, audioJitterMs);
  } else {
    ClLogMessage("Selected the EMSS audio backend\n");
  }

  return 0;
}

void MoonlightInstance::AudDecCleanup(void) {
  // Stop the audio scheduler so it does not keep playing frames that were decoded
  // before the streaming session ended
  if (s_AudioBackend == AudioBackend::WebAudio) {
    MAIN_THREAD_ASYNC_EM_ASM({
      if (typeof stopAudioScheduler === 'function') {
        stopAudioScheduler();
      }
    });
  }

  // Clear the decode buffer
  s_DecodeBuffer.clear();

  // Shrink the decode buffer to fit its contents
  s_DecodeBuffer.shrink_to_fit();
}

void MoonlightInstance::AudDecDecodeAndPlaySample(char* sampleData, int sampleLength) {
  // Check if the Web Audio backend is rendering this streaming session
  if (s_AudioBackend == AudioBackend::WebAudio) {
    // Decode the audio packet and schedule it for playback on the main thread
    DecodeAndScheduleFrame(g_Instance->m_OpusDecoder,
      reinterpret_cast<unsigned char*>(sampleData), sampleLength
    );
    return;
  }

  // Check if audio playback has not started
  if (!g_Instance->m_AudioStarted) {
    return;
  }

  // Check if this is the first audio frame
  if (!s_hasFirstFrame) {
    // Record the time of the first frame
    s_firstAppend = std::chrono::steady_clock::now();
    // Update the flag to indicate that the first frame has been processed
    s_hasFirstFrame = true;
  }

  // Get the current time and calculate the time elapsed since the first frame
  auto now = std::chrono::steady_clock::now();
  TimeStamp ntp = now - s_firstAppend;

  // Check if audio synchronization is enabled and if packet dropping is necessary to avoid overflow
  if (s_AudioSyncEnabled && ntp + kAudioBufferMargin < s_estimatedAudioEnd) {
    ClLogMessage("Dropping audio packet to avoid overflow: PTS=%.03f NTP=%.03f\n", s_pktPts.count(), ntp.count());
    return;
  }

  // Decode and append the audio packet to the audio track
  DecodeAndAppendPacket(&g_Instance->m_AudioTrack,
    g_Instance->m_AudioSessionId.load(), g_Instance->m_OpusDecoder,
    reinterpret_cast<unsigned char*>(sampleData), sampleLength
  );

  // Update the estimated audio end time to prevent future overflow
  s_estimatedAudioEnd = std::max(s_estimatedAudioEnd, ntp) + s_frameDuration;
}

// NOTE: The capabilities are updated before every connection in ConnectionThreadFunc, as the
// Web Audio backend also announces CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION. The value
// below is the one used by the EMSS backend, which is the default audio backend.
AUDIO_RENDERER_CALLBACKS MoonlightInstance::s_ArCallbacks = {
  .init = MoonlightInstance::AudDecInit,
  .cleanup = MoonlightInstance::AudDecCleanup,
  .decodeAndPlaySample = MoonlightInstance::AudDecDecodeAndPlaySample,
  .capabilities = CAPABILITY_DIRECT_SUBMIT,
};
