/* Local music source and live audio analysis for the existing radio/TV controls. */
(() => {
  'use strict';
  window.AshfallLocalAudio = {
    create({ src, title, onReady, onStateChange, onError, onAutoplayBlocked }) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.loop = true;
      let context, analyser, gain, source, volume = 70, muted = true;
      let playerState = -1, pendingPlay = false, generation = 0, sampledAt = -1;
      const spectrum = new Uint8Array(1024), waveform = new Uint8Array(2048);
      waveform.fill(128);
      const analysis = { spectrum, waveform, bass: 0, level: 0 };
      const dock = document.getElementById('cockpit-radio-dock');
      dock.classList.add('local-audio-dock');
      dock.setAttribute('aria-label', 'Local music player');
      const oldPlayer = document.getElementById('youtube-player');
      const panel = document.createElement('div');
      panel.className = 'local-track-panel';
      const name = document.createElement('strong');
      name.textContent = title;
      const playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.textContent = '[ PLAY SONG ]';
      playButton.addEventListener('click', () => {
        const music = window.AshfallAmbientMusic;
        if (!audio.paused && context?.state === 'running' && !muted && volume > 0) music?.setEnabled?.(false);
        else music?.setEnabled?.(true);
      });
      const caption = document.createElement('small');
      caption.textContent = 'CLICK PLAY SONG TO ENABLE SOUND';
      caption.setAttribute('role', 'status');
      caption.setAttribute('aria-live', 'polite');
      const enableButton = document.createElement('button');
      enableButton.type = 'button';
      enableButton.textContent = '[ ENABLE SOUND ]';
      enableButton.addEventListener('click', () => window.AshfallAmbientMusic?.setEnabled?.(true));
      panel.append(name, playButton, enableButton, caption);
      oldPlayer.replaceWith(panel);

      function graph() {
        if (context) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const nextContext = new AudioContext();
        try {
          const nextAnalyser = nextContext.createAnalyser();
          nextAnalyser.fftSize = 2048;
          nextAnalyser.smoothingTimeConstant = 0.75;
          const nextGain = nextContext.createGain();
          nextGain.gain.value = muted ? 0 : volume / 100;
          const nextSource = nextContext.createMediaElementSource(audio);
          nextSource.connect(nextAnalyser);
          nextAnalyser.connect(nextGain);
          nextGain.connect(nextContext.destination);
          context = nextContext; analyser = nextAnalyser; gain = nextGain; source = nextSource;
          context.addEventListener('statechange', () => {
            updateStatus();
            if (context.state !== 'running' && !audio.paused) onAutoplayBlocked();
          });
        } catch (error) { nextContext.close().catch(() => {}); throw error; }
      }
      function updateStatus() {
        const silent = muted || volume <= 0;
        playButton.textContent = !audio.paused && !silent && context?.state === 'running'
          ? '[ PAUSE SONG ]' : !audio.paused ? '[ ENABLE SOUND ]' : '[ PLAY SONG ]';
        caption.textContent = silent ? 'MUSIC MUTED · CLICK ENABLE SOUND'
          : !audio.paused && context?.state !== 'running' ? 'AUDIO SUSPENDED · CLICK ENABLE SOUND'
          : audio.paused ? 'READY · CLICK PLAY SONG'
          : `PLAYING · OUTPUT ${Math.round(volume)}% · LIVE TV VISUALIZER`;
      }
      function output() {
        if (gain) gain.gain.setTargetAtTime(muted ? 0 : volume / 100, context.currentTime, 0.04);
        updateStatus();
      }
      function state(value) {
        playerState = value;
        updateStatus();
        onStateChange({ data: value });
      }
      function sample() {
        const now = performance.now();
        if (now - sampledAt < 16) return analysis;
        sampledAt = now;
        if (!analyser || audio.paused || audio.ended || context.state !== 'running') {
          spectrum.fill(0); waveform.fill(128); analysis.bass = 0; analysis.level = 0;
          return analysis;
        }
        analyser.getByteFrequencyData(spectrum);
        analyser.getByteTimeDomainData(waveform);
        const binHz = context.sampleRate / analyser.fftSize;
        const lo = Math.max(1, Math.floor(40 / binHz)), hi = Math.ceil(180 / binHz);
        let bass = 0, energy = 0;
        for (let i = lo; i <= hi; i++) bass += spectrum[i] / 255;
        for (const value of waveform) energy += ((value - 128) / 128) ** 2;
        analysis.bass = bass / (hi - lo + 1);
        analysis.level = Math.min(1, Math.sqrt(energy / waveform.length) * 3);
        return analysis;
      }
      const adapter = {
        async playVideo() {
          if (pendingPlay || (!audio.paused && context?.state === 'running')) return;
          pendingPlay = true;
          const attempt = ++generation;
          let timeout;
          try {
            graph();
            // Both calls originate inside the user gesture, before yielding.
            await Promise.race([
              Promise.all([context.resume(), audio.play()]),
              new Promise((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('Audio startup needs another click'), { name: 'NotAllowedError' })), 4000); })
            ]);
            output();
          } catch (error) {
            if (attempt !== generation || error.name === 'AbortError') return;
            if (error.name === 'NotAllowedError') onAutoplayBlocked();
            else onError({ data: error.message || 'AUDIO UNAVAILABLE' });
          } finally { clearTimeout(timeout); if (attempt === generation) pendingPlay = false; }
        },
        pauseVideo() { generation++; pendingPlay = false; audio.pause(); },
        seekTo(seconds) { if (Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(seconds, audio.duration)); },
        nextVideo() { adapter.seekTo(0); adapter.playVideo(); },
        previousVideo() { adapter.nextVideo(); },
        playVideoAt() { adapter.nextVideo(); },
        getCurrentTime: () => audio.currentTime,
        getDuration: () => Number.isFinite(audio.duration) ? audio.duration : 0,
        getPlayerState: () => playerState,
        getVideoData: () => ({ video_id: 'local-mp3', title }),
        getPlaylist: () => ['local-mp3'],
        getPlaylistIndex: () => 0,
        setLoop(value) { audio.loop = !!value; },
        setShuffle() {},
        setVolume(value) { volume = Math.max(0, Math.min(100, Number(value) || 0)); output(); },
        getVolume: () => volume,
        mute() { muted = true; output(); },
        unMute() { muted = false; output(); },
        sample,
        get diagnostics() { return { paused: audio.paused, muted, volume, contextState: context?.state || 'not-started', currentTime: audio.currentTime, readyState: audio.readyState, error: audio.error?.code || null }; },
        get audio() { return audio; }
      };
      audio.addEventListener('playing', () => state(1));
      audio.addEventListener('pause', () => { if (!audio.ended) state(2); });
      audio.addEventListener('ended', () => state(0));
      audio.addEventListener('error', () => onError({ data: 'MP3 COULD NOT BE LOADED' }));
      queueMicrotask(() => onReady({ target: adapter }));
      return adapter;
    }
  };
})();
