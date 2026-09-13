// Audio scheduler for the Web Audio backend.
//
// The WASM module decodes each Opus packet on its own audio thread, converts it to planar
// 32-bit float samples and then calls _audReceiveFrame() on the main thread with a pointer to
// those samples. The frames are scheduled against the audio hardware clock instead of being
// polled by a timer, so the TV throttling the timers while an overlay is on screen cannot
// interrupt playback.
//
// The audio context is created by startAudioScheduler() from the user gesture that starts
// the stream, because the autoplay policy blocks contexts created outside of a gesture.
//
// Two properties of the schedule matter for the playback to stay free of artifacts:
//
// - Frames must be scheduled far enough ahead of the audio hardware clock that a stall of the
//   main thread cannot push the start of a frame into the past. That distance is the jitter
//   buffer, and it is both the target the schedule is primed to and the delay the audio is
//   played with. Scheduling a frame in the past leaves a hole in the output that is heard as
//   a click, so the schedule is primed to the whole jitter buffer again whenever it happens.
//
// - Frames must be handed to the audio hardware at its own sample rate. A frame submitted at a
//   different rate is resampled by the browser on its own, without any state carried over from
//   the frame before it, which is heard as a continuous buzz on the boundary of every frame.
//   The scheduler therefore resamples the stream itself whenever the audio context could not
//   be opened at the sample rate of the stream.

// Interval between two lines of scheduler statistics, in milliseconds
var AUD_STATS_INTERVAL_MS = 5000;

// Jitter buffer target used when the WASM module has not published one yet, in milliseconds
var AUD_DEFAULT_TARGET_MS = 100;

// Audio context rendering the stream, or null while the EMSS backend is selected
var _audContext = null;

// Time on the audio hardware clock, in seconds, at which the next frame should start playing
var _audNextTime = 0.0;

// Whether frames are currently being accepted, so that frames decoded just before the stream
// ended are dropped instead of being played over the user interface
var _audRunning = false;

// Sample rate of the stream in Hz, as reported by the WASM module with the frames it decodes
var _audStreamRate = 0;

// Number of samples of the stream consumed for every sample handed to the audio hardware. This
// is 1 while the audio context runs at the sample rate of the stream, which is the usual case.
var _audRatio = 1.0;

// Position of the next output sample within the current frame, in samples of the stream. It is
// carried over from one frame to the next so that resampling never restarts mid stream.
var _audPhase = 0.0;

// Last sample of the previous frame of each channel, which the first output sample of the next
// frame interpolates from, or null while no frame has been resampled yet
var _audTail = null;

// Counters of the current statistics interval, described in _audLogStatistics()
var _audStats = null;

// Reset the counters of the statistics interval
function _audResetStatistics() {
  _audStats = {
    since: Date.now(),
    received: 0,
    scheduled: 0,
    droppedFull: 0,
    droppedEmpty: 0,
    notRunning: 0,
    resyncs: 0,
    underruns: 0,
    decoderGaps: 0,
    lastSequence: -1,
    headroomMin: Infinity,
    headroomMax: -Infinity,
    headroomSum: 0.0,
    // Distribution of the distance between the start of a frame and the audio hardware clock,
    // in the buckets below zero, 0 to 10, 10 to 25, 25 to 50, 50 to 100 and over 100 ms
    histogram: [0, 0, 0, 0, 0, 0],
  };
}

// Record the distance between the start of a scheduled frame and the audio hardware clock
function _audRecordHeadroom(headroomSeconds) {
  var headroom = headroomSeconds * 1000.0;
  var stats = _audStats;

  stats.headroomSum += headroom;
  if (headroom < stats.headroomMin) {
    stats.headroomMin = headroom;
  }
  if (headroom > stats.headroomMax) {
    stats.headroomMax = headroom;
  }

  var bucket = headroom < 0 ? 0
    : headroom < 10 ? 1
    : headroom < 25 ? 2
    : headroom < 50 ? 3
    : headroom < 100 ? 4
    : 5;
  stats.histogram[bucket]++;
}

// Log one line of scheduler statistics once the interval elapsed, or immediately when forced.
// The line carries everything needed to tell the failure modes of the scheduler apart:
//
//   rate      sample rate of the stream and of the audio context, which must be equal for the
//             browser not to resample every frame on its own
//   latency   the latency the audio context reports, which is the delay the frames are played
//             with on top of the jitter buffer
//   frames    frames received, scheduled, dropped because the jitter buffer was full, dropped
//             because resampling produced no samples, and received while the context was not
//             running
//   resync    times the schedule was primed to the jitter buffer again, of which underruns are
//             the ones that happened after playback had already started, so each one of them
//             is a hole in the output
//   gaps      frames the WASM module decoded that never reached the scheduler, which means the
//             main thread was not serviced long enough for the slot pool to wrap around
//   headroom  distance between the start of a frame and the audio hardware clock, which is how
//             much of the jitter buffer was left when the frame was scheduled
function _audLogStatistics(force) {
  var stats = _audStats;
  if (!force && Date.now() - stats.since < AUD_STATS_INTERVAL_MS) {
    return;
  }

  var context = _audContext;
  var average = stats.scheduled > 0 ? stats.headroomSum / stats.scheduled : 0;
  var format = function(value) {
    return isFinite(value) ? value.toFixed(1) : 'n/a';
  };

  console.log('%c[audio.js, statistics]', 'color: teal;',
    'rate=' + _audStreamRate + '/' + (context ? context.sampleRate : 0) + ' Hz' +
    ' ratio=' + _audRatio.toFixed(4) +
    ' | latency base=' + format(context ? context.baseLatency * 1000.0 : NaN) + ' ms' +
    ' output=' + format(context && context.outputLatency ? context.outputLatency * 1000.0 : NaN) + ' ms' +
    ' | frames received=' + stats.received +
    ' scheduled=' + stats.scheduled +
    ' dropped=' + stats.droppedFull +
    ' empty=' + stats.droppedEmpty +
    ' idle=' + stats.notRunning +
    ' | resync=' + stats.resyncs +
    ' underrun=' + stats.underruns +
    ' gaps=' + stats.decoderGaps +
    ' | headroom min=' + format(stats.headroomMin) +
    ' avg=' + format(average) +
    ' max=' + format(stats.headroomMax) + ' ms' +
    ' | histogram <0=' + stats.histogram[0] +
    ' 0-10=' + stats.histogram[1] +
    ' 10-25=' + stats.histogram[2] +
    ' 25-50=' + stats.histogram[3] +
    ' 50-100=' + stats.histogram[4] +
    ' 100+=' + stats.histogram[5]);

  var lastSequence = stats.lastSequence;
  _audResetStatistics();
  _audStats.lastSequence = lastSequence;
}

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
  _audStreamRate = 0;
  _audRatio = 1.0;
  _audPhase = 0.0;
  _audTail = null;
  _audResetStatistics();

  // Report the state of the audio path, which the TV may reopen at a different sample rate or
  // suspend altogether when a picture mode such as Game Mode reroutes its audio output
  _audContext.onstatechange = function() {
    console.log('%c[audio.js, startAudioScheduler]', 'color: teal;', 'The audio context changed its state to ' + _audContext.state + '.');

    // Prime the schedule again once the context comes back, as the audio hardware clock kept
    // running while the output was interrupted
    _audNextTime = 0.0;
  };

  console.log('%c[audio.js, startAudioScheduler]', 'color: teal;',
    'Started the audio scheduler with a sample rate of ' + _audContext.sampleRate + ' Hz,' +
    ' a base latency of ' + (_audContext.baseLatency * 1000.0).toFixed(1) + ' ms,' +
    ' an output latency of ' + ((_audContext.outputLatency || 0) * 1000.0).toFixed(1) + ' ms and' +
    ' up to ' + _audContext.destination.maxChannelCount + ' output channels.');
}

// Stop accepting decoded frames and release the audio context
function stopAudioScheduler() {
  if (_audContext && _audStats) {
    _audLogStatistics(true);
  }

  _audRunning = false;
  _audNextTime = 0.0;
  _audStreamRate = 0;
  _audRatio = 1.0;
  _audPhase = 0.0;
  _audTail = null;
  _audStats = null;

  if (_audContext) {
    try {
      _audContext.onstatechange = null;
      _audContext.close();
    } catch (error) {
      console.warn('%c[audio.js, stopAudioScheduler]', 'color: teal;', 'Failed to close the audio context: ' + error);
    }
    _audContext = null;
    console.log('%c[audio.js, stopAudioScheduler]', 'color: teal;', 'Stopped the audio scheduler.');
  }
}

// Adopt the format of the stream, which is only known once the first frame has been decoded
function _audAdoptStreamFormat(sampleRate, channels) {
  _audStreamRate = sampleRate;
  _audRatio = sampleRate / _audContext.sampleRate;
  _audPhase = 0.0;
  _audTail = null;

  if (_audRatio !== 1.0) {
    console.warn('%c[audio.js, _audReceiveFrame]', 'color: teal;',
      'The audio context runs at ' + _audContext.sampleRate + ' Hz while the stream is ' + sampleRate + ' Hz,' +
      ' so the frames are resampled by the scheduler.');
  }

  console.log('%c[audio.js, _audReceiveFrame]', 'color: teal;',
    'Rendering ' + channels + ' channels of ' + sampleRate + ' Hz audio' +
    ' with a jitter buffer of ' + (window._mlAudioTargetMs || AUD_DEFAULT_TARGET_MS) + ' ms.');
}

// Copy one frame out of the WASM heap into an audio buffer, resampling it to the sample rate of
// the audio context when the two differ. The resampler interpolates from the last sample of the
// previous frame and carries its position over, so no discontinuity is introduced at the frame
// boundaries. Returns the buffer to schedule, or null when the frame produced no samples.
function _audBuildBuffer(heapOffset, samples, channels, stride) {
  var heap = Module.HEAPF32;
  var base = heapOffset >> 2;
  var channel;

  if (_audRatio === 1.0) {
    var direct = _audContext.createBuffer(channels, samples, _audContext.sampleRate);
    for (channel = 0; channel < channels; channel++) {
      var offset = base + channel * stride;
      direct.getChannelData(channel).set(heap.subarray(offset, offset + samples));
    }
    return direct;
  }

  // Emit one sample for every position of the schedule that still falls inside this frame. The
  // position may start just before the frame, in which case the first sample is interpolated
  // from the tail of the previous frame that is held in _audTail.
  var count = Math.max(0, Math.ceil((samples - 1 - _audPhase) / _audRatio));
  var buffer = count > 0 ? _audContext.createBuffer(channels, count, _audContext.sampleRate) : null;

  if (!_audTail || _audTail.length !== channels) {
    _audTail = new Float32Array(channels);
  }

  for (channel = 0; channel < channels; channel++) {
    var source = base + channel * stride;
    var tail = _audTail[channel];

    if (buffer) {
      var output = buffer.getChannelData(channel);
      var position = _audPhase;
      for (var index = 0; index < count; index++) {
        var whole = Math.floor(position);
        var fraction = position - whole;
        // A position before the frame reads the last sample of the previous one, and the
        // position never reaches the last sample of this frame, so whole + 1 stays in range
        var first = whole < 0 ? tail : heap[source + whole];
        var second = heap[source + whole + 1];
        output[index] = first + (second - first) * fraction;
        position += _audRatio;
      }
    }

    _audTail[channel] = heap[source + samples - 1];
  }

  // Move the position of the next output sample into the frame that follows this one
  _audPhase = _audPhase + count * _audRatio - samples;

  return buffer;
}

// Schedule a decoded audio frame handed over by the WASM module
//   heapOffset - byte offset of the planar 32-bit float samples in the WASM heap
//   samples    - number of samples per channel in the frame
//   channels   - number of channels of the frame (2 for Stereo, 6 for 5.1, 8 for 7.1)
//   sampleRate - sample rate of the frame in Hz (48000)
//   stride     - number of samples between the channels of the frame in the WASM heap
//   sequence   - index of the frame in the stream, used to detect frames that never arrived
function _audReceiveFrame(heapOffset, samples, channels, sampleRate, stride, sequence) {
  if (!_audRunning || !_audContext) {
    return;
  }

  var stats = _audStats;
  stats.received++;

  // Count the frames the WASM module decoded that never reached the scheduler, which happens
  // when the main thread was not serviced for long enough that the slot pool wrapped around
  if (stats.lastSequence >= 0 && sequence > stats.lastSequence + 1) {
    stats.decoderGaps += sequence - stats.lastSequence - 1;
  }
  stats.lastSequence = sequence;

  // The audio context starts suspended when the stream begins without a user gesture, and the
  // TV may suspend it again while it reconfigures its audio output, so resume it and let the
  // next frame be the first one to be scheduled
  if (_audContext.state !== 'running') {
    if (_audContext.state === 'suspended') {
      try {
        _audContext.resume();
      } catch (error) {
        console.warn('%c[audio.js, _audReceiveFrame]', 'color: teal;', 'Failed to resume the audio context: ' + error);
      }
    }
    stats.notRunning++;
    _audNextTime = 0.0;
    return;
  }

  // Adopt the format of the stream, and the resampling it may call for, on the first frame
  if (sampleRate !== _audStreamRate) {
    _audAdoptStreamFormat(sampleRate, channels);
  }

  // Read the position of the audio hardware clock, which always moves forward
  var now = _audContext.currentTime;

  // Convert the jitter buffer target published by the WASM module to seconds
  var targetSeconds = (window._mlAudioTargetMs || AUD_DEFAULT_TARGET_MS) / 1000.0;

  // Prime the schedule to the whole jitter buffer when it fell behind the clock, which happens
  // on the first frame and whenever the main thread was stalled for longer than the frames that
  // were left to play. Snapping to the clock itself would leave the schedule with no headroom
  // at all, so the next stall of any length would leave another hole in the output.
  if (_audNextTime < now) {
    if (_audNextTime !== 0.0) {
      stats.underruns++;
    }
    _audNextTime = now + targetSeconds;
    _audPhase = 0.0;
    _audTail = null;
    stats.resyncs++;
  }

  // Drop the frame once the schedule ran away from the clock by twice the jitter buffer, which
  // keeps the audio delay bounded when the host produces audio faster than the TV plays it
  if (_audNextTime > now + 2.0 * targetSeconds) {
    stats.droppedFull++;
    _audLogStatistics(false);
    return;
  }

  var buffer = _audBuildBuffer(heapOffset, samples, channels, stride);
  if (!buffer) {
    stats.droppedEmpty++;
    _audLogStatistics(false);
    return;
  }

  // Play the frame right after the frames that are already scheduled
  var source = _audContext.createBufferSource();
  source.buffer = buffer;
  source.connect(_audContext.destination);
  source.start(_audNextTime);

  _audRecordHeadroom(_audNextTime - now);
  stats.scheduled++;

  _audNextTime += buffer.duration;
  _audLogStatistics(false);
}
