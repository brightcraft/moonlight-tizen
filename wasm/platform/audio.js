// Audio scheduler for the Web Audio backend.
//
// The WASM module decodes each Opus packet on its own audio thread and then calls
// _audReceiveFrame() on the main thread with a pointer to the decoded samples. The frames
// are scheduled against the audio hardware clock instead of being polled by a timer, so
// the TV throttling the timers while an overlay is on screen cannot interrupt playback.
//
// The audio context is created by startAudioScheduler() from the user gesture that starts
// the stream, because the autoplay policy blocks contexts created outside of a gesture.

// Audio context rendering the stream, or null while the EMSS backend is selected
var _audContext = null;

// Time on the audio hardware clock, in seconds, at which the next frame should start playing
var _audNextTime = 0.0;

// Whether frames are currently being accepted, so that frames decoded just before the stream
// ended are dropped instead of being played over the user interface
var _audRunning = false;

// Create the audio context and start accepting decoded frames. This must be called from a
// user gesture handler, as the audio context is otherwise blocked by the autoplay policy.
function startAudioScheduler() {
  stopAudioScheduler();

  var AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    console.error('%c[audio.js, startAudioScheduler]', 'color: teal;', 'Error: The Web Audio API is not available on this device!');
    return;
  }

  try {
    // Request the stream sample rate and the lowest latency the device can provide
    _audContext = new AudioContextConstructor({ sampleRate: 48000, latencyHint: 'interactive' });
  } catch (error) {
    console.warn('%c[audio.js, startAudioScheduler]', 'color: teal;', 'Falling back to the default audio context options: ' + error);
    _audContext = new AudioContextConstructor();
  }

  _audNextTime = 0.0;
  _audRunning = true;
  console.log('%c[audio.js, startAudioScheduler]', 'color: teal;', 'Started the audio scheduler with a sample rate of ' + _audContext.sampleRate + ' Hz.');
}

// Stop accepting decoded frames and release the audio context
function stopAudioScheduler() {
  _audRunning = false;
  _audNextTime = 0.0;

  if (_audContext) {
    try {
      _audContext.close();
    } catch (error) {
      console.warn('%c[audio.js, stopAudioScheduler]', 'color: teal;', 'Failed to close the audio context: ' + error);
    }
    _audContext = null;
    console.log('%c[audio.js, stopAudioScheduler]', 'color: teal;', 'Stopped the audio scheduler.');
  }
}

// Schedule a decoded audio frame handed over by the WASM module
//   heapOffset - byte offset of the interleaved 16-bit samples in the WASM heap
//   samples    - number of samples per channel in the frame
//   channels   - number of channels of the frame (2 for Stereo, 6 for 5.1, 8 for 7.1)
//   sampleRate - sample rate of the frame in Hz (48000)
function _audReceiveFrame(heapOffset, samples, channels, sampleRate) {
  if (!_audRunning || !_audContext) {
    return;
  }

  // The audio context starts suspended when the stream begins without a user gesture,
  // so resume it and let the next frame be the first one to be scheduled
  if (_audContext.state === 'suspended') {
    try {
      _audContext.resume();
    } catch (error) {
      console.warn('%c[audio.js, _audReceiveFrame]', 'color: teal;', 'Failed to resume the audio context: ' + error);
    }
    return;
  }

  // Read the position of the audio hardware clock, which always moves forward
  var now = _audContext.currentTime;

  // Convert the jitter buffer target published by the WASM module to seconds
  var targetSeconds = (window._mlAudioTargetMs || 100) / 1000.0;

  // Snap the schedule to the clock when it fell behind, which happens on the first frame
  // and after the playback was interrupted, so that frames are never scheduled in the past
  if (_audNextTime < now) {
    _audNextTime = now;
  }

  // Drop the frame once the jitter buffer is full, which keeps the audio delay bounded when
  // a burst of frames arrives after the browser stopped servicing the main thread for a while
  if (_audNextTime > now + targetSeconds) {
    return;
  }

  // Copy the interleaved samples out of the WASM heap into a buffer of planar channels,
  // scaling the 16-bit samples to the -1.0 to 1.0 range expected by the Web Audio API
  var buffer = _audContext.createBuffer(channels, samples, sampleRate);
  var heapIndex = heapOffset >> 1;
  for (var channel = 0; channel < channels; channel++) {
    var channelData = buffer.getChannelData(channel);
    for (var sample = 0; sample < samples; sample++) {
      channelData[sample] = Module.HEAP16[heapIndex + sample * channels + channel] / 32768.0;
    }
  }

  // Play the frame right after the frames that are already scheduled
  var source = _audContext.createBufferSource();
  source.buffer = buffer;
  source.connect(_audContext.destination);
  source.start(_audNextTime);
  _audNextTime += buffer.duration;
}
