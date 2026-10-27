/* RAVE SHOW: "Acid Techno From The Future" starts the moment you enter the game and drives a live light show in the lobby.
   Audio: the track plays through the game's music bus (so the MIX slider and mute apply) and an AnalyserNode splits it into three bands (bass 20-150 Hz, mids 150-2 kHz, highs 2-16 kHz).
   Light show: a truss over the fight ring carries moving-head beams (pan / tilt orbits that speed up with the tempo) and laser emitters (fans, sweeps, cones, crosses, scans) that
   cut through the haze, colour spots where beams hit the wet floor, strobes locked to bass transients, and the existing floodlights and neon signs pulse with the music.
   Structure: a small section tracker (intro / verse / build / break / drop / outro) switches to a randomly chosen visual preset at natural transitions so it does not repeat.
   Performance: ~50 additive meshes, no extra scene lights (existing floodlights are re-coloured), and everything is skipped unless the lobby is on screen. Controls: dev menu (9) > RAVE.
   Strobes are limited to 3 flashes per second at low opacity and are off with reduced motion. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu, Y = window.AshfallYardDressing;
if (!hub || !T || !W?.yard || !MM || typeof MM.update !== 'function' || !Y) return;
const yard = W.yard, PI = Math.PI, TRACK = 'audio/acid-techno-from-the-future.mp3';
const cfg = { enabled: true, sensitivity: 3, colorSpeed: 1, laserCount: 24, laserThickness: .05, blackoutThreshold: .5, beamBrightness: 1, strobe: .6, strobeRarity: .7, syncMs: null, strobeBanks: true, strobeDensity: .5, strobeMaxHz: 4, strobeBright: 1, strobeDuty: .3, diversify: true, smoke: true, smokeAmount: 1, lasers: true, beams: true, strobes: true, floor: true, preset: 'auto' };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || window.AshfallSettings?.state?.reduceMotion;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;

// ---- presets ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const hsl = (h, s = 1, l = .55) => new T.Color().setHSL(((h % 1) + 1) % 1, s, l);
const PRESETS = {
  cyber: { name: 'Cyber-Neon', colors: () => [new T.Color(0x39ff6a), new T.Color(0xff2fd0), new T.Color(0x2fe0ff), new T.Color(0x3a5bff)], patterns: ['fan', 'sweep', 'cone', 'cross'], speed: 1, strobe: .8 },
  industrial: { name: 'Industrial Red/White', colors: () => [new T.Color(0xff2a1a), new T.Color(0xffffff), new T.Color(0xffa030), new T.Color(0xff5a3a)], patterns: ['sweep', 'cross', 'scan', 'fan'], speed: .85, strobe: 1 },
  chaos: { name: 'Chaos Spark', colors: () => { const h = Math.random(); return [hsl(h), hsl(h + .18), hsl(h + .36), hsl(h + .6)] }, patterns: ['scan', 'cone', 'cross', 'sweep', 'fan'], speed: 1.5, strobe: 1 }
};
const PRESET_KEYS = Object.keys(PRESETS);

// ---- audio: dedicated element on the game's music bus + analyser ------------------------------------------------------------------------------------------------------------------------
const audio = new Audio(TRACK); audio.loop = true; audio.preload = 'auto'; audio.crossOrigin = 'anonymous';
let ctx = null, analyser = null, srcNode = null, freq = null, fd = null, wasMenuMusic = false, playing = false;
function ensureGraph() {
  if (srcNode) return true;
  const S = window.AshfallSettings; if (!S) return false; S.setEnvironmentMode?.(false); const a = S.audio; if (!a?.context) return false;
  ctx = a.context; srcNode = ctx.createMediaElementSource(audio); analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .2; freq = new Uint8Array(analyser.frequencyBinCount); fd = new Float32Array(analyser.frequencyBinCount);
  srcNode.connect(analyser); analyser.connect(a.music || a.master); return true;
}
function startMusic() {
  const MP = window.AshfallMusicPause; if (MP?.holdNext) MP.enterPaused();
  if (MP?.paused) { show.pendingStart = true; return }
  if (playing) return; if (!ensureGraph()) return;
  const mp = window.AshfallMediaPlayer; wasMenuMusic = true; try { mp?.pause?.(); mp?.setMuted?.(true) } catch {}
  ctx.resume?.(); audio.currentTime = 0; audio.play().then(() => { playing = true }).catch(e => console.warn('[rave] could not start the track', e));
  playing = true; show.t0 = 0; reset();
}
function stopMusic() {
  if (!playing && audio.paused) return; playing = false; audio.pause();
  const mp = window.AshfallMediaPlayer; if (wasMenuMusic) { try { mp?.setMuted?.(false); if (!window.AshfallMusicPause?.paused) mp?.play?.() } catch {} wasMenuMusic = false }
}

// ---- analysis: bands, beat detection, tempo, section tracker -----------------------------------------------------------------------------------------------------------------------------------
const an = { bass: 0, mid: 0, high: 0, bassAvg: 0, beat: false, lastBeat: 0, bpm: 120, intervals: [], bassHist: [], energyLong: 0, energyShort: 0, bassLong: 0, bassShort: 0, highShort: 0, bassMin: 1, section: 'INTRO', sectionSince: 0, preset: 'cyber', colors: PRESETS.cyber.colors(), target: PRESETS.cyber.colors(), pattern: 'fan', patternSince: 0, flash: 0, transient: 0 };
const show = { t0: 0 };
function reset() { an.bass = an.mid = an.high = an.bassAvg = 0; an.intervals.length = 0; an.section = 'INTRO'; an.sectionSince = 0; an.bassLong = an.bassShort = an.energyLong = an.energyShort = 0 }
function bandAvg(f0, f1) { const hz = ctx.sampleRate / analyser.fftSize, a = Math.max(1, Math.floor(f0 / hz)), b = Math.min(freq.length - 1, Math.ceil(f1 / hz)); let s = 0; for (let i = a; i <= b; i++) s += freq[i]; return s / ((b - a + 1) * 255) }
/* Beat state: everything the rig does is a function of this, never of free-running time. gate = lights up or down with the loudness of the music (blackout when it falls away),
   pulse = jumps to 1 on every kick and decays, step = integer that advances on every kick (patterns are chosen by it), bar = every 4th kick. */
const bs = { count: 0, step: 0, bar: 0, pulse: 0, pulseA: 0, pulseB: 0, drop: 0, gate: 0, blackout: false, level: 0, levelSlow: 0, ref: .05, prevBass: 0, flux: [], rel: 1, hi: 0, hiStep: 0, hiAvg: 0, lastHi: 0, zOn: 0, onM: 0, onV: 1, quietFor: 0, pkB: 1e-4, pkM: 1e-4, pkH: 1e-4 };
const grid = { period: 0, next: 0, conf: 0, onset: 0, env: [], prev: null, lastTempo: 0, lastPhase: 0 };
const ENV_DT = .02, ENV_LEN = 400;
function onsetTick(now) {
  const hz = ctx.sampleRate / analyser.fftSize, a = Math.max(1, Math.floor(30 / hz)), b = Math.min(fd.length - 1, Math.ceil(6000 / hz));
  if (!grid.prev) grid.prev = new Float32Array(fd.length).fill(-120);
  let o = 0; for (let k = a; k <= b; k++) { const d = fd[k] - grid.prev[k]; if (d > 0) o += Math.min(d, 24); grid.prev[k] = fd[k] }
  o /= (b - a + 1); grid.onset = o;
  const e = grid.env; e.push([now, o]); while (e.length && now - e[0][0] > 8) e.shift();
  if (now - grid.lastTempo > .4 && e.length > 60) { grid.lastTempo = now; estimateTempo(now) }
  if (grid.period && now - grid.lastPhase > .25) { grid.lastPhase = now; estimatePhase(now) }
}
function resample(now, secs) { const n = Math.floor(secs / ENV_DT), out = new Float32Array(n), e = grid.env; let k = 0; for (let i = 0; i < n; i++) { const t = now - secs + i * ENV_DT; let m = 0; while (k < e.length && e[k][0] < t + ENV_DT) { if (e[k][0] >= t) m = Math.max(m, e[k][1]); k++ } out[i] = m } return out }
function estimateTempo(now) {
  const secs = Math.min(8, now - grid.env[0][0]); if (secs < 3) return; const x = resample(now, secs), n = x.length; let mean = 0; for (const v of x) mean += v; mean /= n; for (let i = 0; i < n; i++) x[i] -= mean;
  let best = 0, bestLag = 0, sum = 0, cnt = 0, r0 = 0; for (let i = 0; i < n; i++) r0 += x[i] * x[i]; if (r0 <= 1e-9) return;
  for (let lag = 20; lag <= 27; lag++) {                                               // 0.30 - 0.60 s per beat = 100 - 200 bpm
    let r = 0; for (let i = 0; i + lag < n; i++) r += x[i] * x[i + lag]; r /= r0;
    const bpm = 60 / (lag * ENV_DT), pref = Math.exp(-Math.pow((bpm - 132) / 38, 2)) * (grid.period ? Math.exp(-Math.pow((lag * ENV_DT - grid.period) / .06, 2)) * .5 + .5 : 1);
    const w = r * (.6 + .4 * pref); sum += Math.max(0, r); cnt++; if (w > best) { best = w; bestLag = lag }
  }
  if (!bestLag) return; const avg = sum / cnt, period = bestLag * ENV_DT;
  grid.conf = lerp(grid.conf, best / Math.max(1e-4, avg), .5);
  grid.period = grid.period ? lerp(grid.period, period, .35) : period;
}
function estimatePhase(now) {
  const P = grid.period, secs = Math.min(6, now - grid.env[0][0]); if (secs < 2) return; const bins = 24, acc = new Float32Array(bins);
  for (const [t, v] of grid.env) { if (now - t > secs) continue; const f = (((t % P) + P) % P) / P; acc[Math.min(bins - 1, Math.floor(f * bins))] += v }
  let bi = 0; for (let i = 1; i < bins; i++) if (acc[i] > acc[bi]) bi = i;
  const target = (bi + .5) / bins * P;                                                   // phase of the strongest onset energy within the beat period (t mod P)
  const cur = ((grid.next % P) + P) % P; let err = target - cur; err = ((err + P * 1.5) % P) - P * .5;
  if (!grid.next) { grid.next = now + ((target - (now % P) + P) % P) } else grid.next += err * .3;
}
function bandAmp(f0, f1) { const hz = ctx.sampleRate / analyser.fftSize, a = Math.max(1, Math.floor(f0 / hz)), b = Math.min(fd.length - 1, Math.ceil(f1 / hz)); let sum = 0; for (let i = a; i <= b; i++) sum += Math.pow(10, fd[i] / 20); return sum / (b - a + 1) }
function analyse(now, dt) {
  if (!analyser || !playing || audio.paused) { an.bass *= .9; an.mid *= .9; an.high *= .9; an.beat = false; bs.gate += (0 - bs.gate) * Math.min(1, dt * 6); bs.pulse *= Math.exp(-dt * 8); bs.pulseA *= Math.exp(-dt * 8); bs.pulseB *= Math.exp(-dt * 8); return }
  analyser.getFloatFrequencyData(fd); const k = cfg.sensitivity;
  const aB = bandAmp(25, 150), aM = bandAmp(150, 2000), aH = bandAmp(2000, 16000);
  bs.pkB = Math.max(aB, bs.pkB * Math.exp(-dt / 20)); bs.pkM = Math.max(aM, bs.pkM * Math.exp(-dt / 20)); bs.pkH = Math.max(aH, bs.pkH * Math.exp(-dt / 20));       // each band relative to its own recent peak
  const rb = aB / Math.max(1e-6, bs.pkB), rm = aM / Math.max(1e-6, bs.pkM), rh = aH / Math.max(1e-6, bs.pkH);
  const bass = clamp(rb * k, 0, 1), mid = clamp(rm * 1.2 * k, 0, 1), high = clamp(rh * 1.3 * k, 0, 1);
  an.bass = lerp(an.bass, bass, .6); an.mid = lerp(an.mid, mid, .4); an.high = lerp(an.high, high, .55);
  // loudness gate: how loud is the music right now compared with its own recent peak? quiet passages put the lights out, the return brings them back with a flash
  const level = rb * .65 + rm * .35; bs.level = lerp(bs.level, level, Math.min(1, dt * 14)); bs.levelSlow = lerp(bs.levelSlow, level, Math.min(1, dt * 3.5));
  bs.ref = Math.max(bs.levelSlow, bs.ref * Math.exp(-dt / 30)); bs.rel = bs.levelSlow / Math.max(.02, bs.ref);
  const was = bs.blackout; if (bs.blackout) { if (bs.rel > cfg.blackoutThreshold + .15) bs.blackout = false } else if (bs.rel < cfg.blackoutThreshold) bs.blackout = true;
  if (was && !bs.blackout) bs.drop = 1;
  bs.gate += ((bs.blackout ? 0 : 1) - bs.gate) * Math.min(1, dt * (bs.blackout ? 5 : 14));
  // beat tracking: onset strength (positive spectral flux, 30 Hz - 6 kHz) -> tempo by autocorrelation -> phase by folding onsets onto the beat period -> a steady beat grid.
  // The grid fires the beats, so a kick that is masked by a bass line or a hi-hat roll does not drop a beat, and a stray hit between kicks does not add one.
  onsetTick(now);
  an.beat = false;
  if (grid.period && grid.conf > 1.25 && now >= grid.next - .015) {
    const fire = !bs.blackout; while (grid.next <= now + .015) grid.next += grid.period;
    if (fire) { an.beat = true; an.lastBeat = now; an.bpm = 60 / grid.period; later(now, () => { bs.count++; bs.step++; bs.beatT = performance.now() / 1000; bs.pulse = 1; if (bs.count % 2) bs.pulseA = 1; else bs.pulseB = 1; if (bs.count % 4 === 0) bs.bar++; onBeat() }) }
  }
  an.transient = grid.onset;
  bandTick(now, dt);
  drain(now);
  // how extreme is the current transient compared with the music's own running statistics (the rare strobes use this)
  bs.onM = lerp(bs.onM, grid.onset, Math.min(1, dt * .25)); bs.onV = lerp(bs.onV, (grid.onset - bs.onM) ** 2, Math.min(1, dt * .25)); bs.zOn = (grid.onset - bs.onM) / Math.sqrt(bs.onV + 1e-3);
  // a huge drop: the lights come back after a real quiet stretch
  if (bs.blackout) bs.quietFor += dt; else { if (was && bs.quietFor > 3) bigDrop(now); bs.quietFor = 0 }
  bs.pulse *= Math.exp(-dt * 6.5); bs.pulseA *= Math.exp(-dt * 5.5); bs.pulseB *= Math.exp(-dt * 5.5); bs.drop *= Math.exp(-dt * 3); an.flash = bs.pulse;
  an.bassShort = lerp(an.bassShort, bass, Math.min(1, dt * .8)); an.bassLong = lerp(an.bassLong, bass, Math.min(1, dt * .08)); an.highShort = lerp(an.highShort, high, Math.min(1, dt * .8)); an.energyShort = lerp(an.energyShort, bass + mid, Math.min(1, dt * .8)); an.energyLong = lerp(an.energyLong, bass + mid, Math.min(1, dt * .08));
  sections(now);
}
// ---- 8 frequency bands: every light listens to exactly one of them and only moves / flashes when that band HITS --------------------------------------------------------------------
const BANDS = [[30, 70, 'SUB'], [70, 150, 'KICK'], [150, 400, 'LOW'], [400, 1000, 'MID'], [1000, 2500, 'UPPER'], [2500, 5000, 'PRESENCE'], [5000, 10000, 'HATS'], [10000, 16000, 'AIR']];
const DECAY = [4, 5.5, 6.5, 7.5, 9, 10, 12, 14], MINGAP = [.2, .17, .13, .11, .1, .09, .08, .08];
const band = BANDS.map(([lo, hi, name], b) => ({ lo, hi, name, pk: 1e-5, avg: 0, r: 0, pulse: 0, hits: 0, last: 0 }));
const queue = [];
// where the sound is heard lags the analyser by the audio output latency; delay every visual hit by that amount (cfg.syncMs, dev menu: SYNC) so picture and sound land together
const syncDelay = () => (cfg.syncMs == null ? Math.max(0, ((ctx?.outputLatency || 0) + (ctx?.baseLatency || 0)) * 1000 - 20) : cfg.syncMs) / 1000;
function later(now, fn) { const d = syncDelay(); if (d < .004) fn(); else queue.push([now + d, fn]) }
function drain(now) { while (queue.length && queue[0][0] <= now) queue.shift()[1]() }
function bandTick(now, dt) {
  const lights = allLights();
  for (let b = 0; b < band.length; b++) {
    const B = band[b], a = bandAmp(B.lo, B.hi); B.pk = Math.max(a, B.pk * Math.exp(-dt / 12)); const r = a / Math.max(1e-6, B.pk);
    const hit = !bs.blackout && r > B.avg * 1.3 + .05 && r > .22 && now - B.last > MINGAP[b] && r - B.r > .02;
    B.avg = lerp(B.avg, r, Math.min(1, dt * 3)); B.r = r;
    if (hit) { B.last = now; later(now, () => { B.hits++; B.pulse = 1; for (const L of lights) if (L.band === b) hitLight(L); for (const f of Y.floodLights || []) if (f.band === b) f.p = 1 }) }
    B.pulse *= Math.exp(-dt * DECAY[b]);
  }
}
// a light hit by its own band: flash and jump to a new part of the club
function hitLight(L) {
  L.p = 1; L.n = (L.n || 0) + 1; if (!L.aimable) return; const sid = (L.id || 0) * 7.3 + L.n * 3.1;
  aimCell(L, ((L.id || 0) * 3 + L.n * 2) | 0, ((L.id || 0) + L.n * 2 + (L.band || 0)) | 0, sid, L.high);
}
function allLights() { return allList || (allList = [...heads, ...subs, ...lasers]) }
let allList = null;
const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
// diversity: every band is dealt out across the lights; the deal is reshuffled on every section change and every 32 beats, so different lights answer to different sounds over time
function assign() {
  const deal = (arr, pool) => { const idx = shuf(arr.map((_, i) => i)), off = Math.floor(Math.random() * pool.length); idx.forEach((j, n) => { arr[j].band = pool[(n + off) % pool.length] }) };
  deal(heads, [0, 1, 2, 3, 4, 5, 6, 7]); deal(subs, [0, 1, 2, 3, 1, 0]); deal(lasers, [3, 4, 5, 6, 7, 2, 6, 7]); const fl = Y.floodLights || []; deal(fl, [0, 1, 2, 3]); assign.last = bs.count;
}
function sections(now) {
  const t = audio.currentTime, dwell = now - an.sectionSince; let next = an.section;
  if (t < 16) next = 'INTRO';
  else if (audio.duration && isFinite(audio.duration) && audio.duration - t < 22) next = 'OUTRO';
  else if (an.bassShort < an.bassLong * .45 && dwell > 3) next = 'BREAK';
  else if ((an.section === 'BREAK' || an.section === 'BUILD') && an.bassShort > an.bassLong * .8 && an.beat) next = 'DROP';
  else if (an.section === 'BREAK' && an.highShort > .35 && dwell > 6) next = 'BUILD';
  else if (an.section === 'DROP' && dwell > 28) next = 'VERSE';
  else if (an.section === 'INTRO' && t >= 16) next = 'VERSE';
  if (next !== an.section) { an.section = next; an.sectionSince = now; if (next === 'DROP') bigDrop(now); if (cfg.diversify) assign(); if (next === 'DROP' || next === 'BUILD' || next === 'BREAK' || next === 'VERSE') choosePreset(next) }
}
function choosePreset(why) {
  let key = cfg.preset; if (key === 'auto' || !PRESETS[key]) { const pool = PRESET_KEYS.filter(k => k !== an.preset); key = why === 'DROP' && Math.random() < .5 ? 'chaos' : pool[Math.floor(Math.random() * pool.length)] }
  if (key === an.preset && PRESETS[key] && cfg.preset !== 'auto') { an.target = PRESETS[key].colors(); return }
  an.preset = key; an.target = PRESETS[key].colors(); const p = PRESETS[key].patterns; an.pattern = p[Math.floor(Math.random() * p.length)];
}

// ---- the rig: truss over the ring, 14 moving-head beams, 28 laser emitters, floor spots ---------------------------------------------------------------------------------------------------
const rig = new T.Group(); rig.name = 'RAVE_RIG'; rig.position.set(0, 0, -62); yard.add(rig);
const dark = new T.MeshStandardMaterial({ color: 0x15191b, roughness: .6, metalness: .8 }), steel = new T.MeshStandardMaterial({ color: 0x40484c, roughness: .5, metalness: .8 });
const TY = 19.6;
for (const z of [-1.1, 1.1]) for (const y of [TY, TY + 1.2]) { const b = new T.Mesh(new T.BoxGeometry(26, .16, .16), steel); b.position.set(0, y, z); rig.add(b) }
for (let x = -13; x <= 13; x += 1.6) { const s = new T.Mesh(new T.BoxGeometry(.1, 1.2, 2.2), steel); s.position.set(x, TY + .6, 0); rig.add(s) }
for (const sx of [-12.5, 12.5]) for (const z of [-1.1, 1.1]) { const c = new T.Mesh(new T.CylinderGeometry(.04, .04, 8, 5), dark); c.position.set(sx, TY + 5, z); rig.add(c) }
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c) })();
const addMat = (c, o = 1) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
const NH = 14, heads = [];
const BEAM_LEN = 34, beamGeo = new T.ConeGeometry(1.7, BEAM_LEN, 14, 1, true); beamGeo.translate(0, -BEAM_LEN / 2, 0);
for (let i = 0; i < NH; i++) {
  const x = -11.7 + i * (23.4 / (NH - 1)), pan = new T.Group(); pan.position.set(x, TY - .1, (i % 2 ? .9 : -.9)); rig.add(pan); const tilt = new T.Group(); pan.add(tilt);
  const body = new T.Mesh(new T.CylinderGeometry(.22, .3, .55, 10), dark); body.position.y = -.25; tilt.add(body);
  const lens = new T.Mesh(new T.CircleGeometry(.2, 14), addMat(0xffffff, .9)); lens.rotation.x = PI / 2; lens.position.y = -.53; tilt.add(lens);
  const beam = new T.Mesh(beamGeo, addMat(0xffffff, .09)); beam.position.y = -.5; beam.renderOrder = 4; tilt.add(beam);
  heads.push({ aimable: true, id: i, node: tilt, o: pan.position, pan, tilt, lens, beam, phase: Math.random() * 6.3, rate: .5 + Math.random() * .8 });
}
const NL = 28, lasers = [], laserGeo = new T.CylinderGeometry(1, 1, 60, 6, 1, true); laserGeo.translate(0, -30, 0);
const emitters = [];
const EMIT = [[-21, -17], [21, -17], [-21, 22], [21, 22], [-21, 2], [21, 2], [0, -18], [0, 22], [-10, -18], [10, 22]];
for (let i = 0; i < EMIT.length; i++) { const e = new T.Group(); e.position.set(EMIT[i][0], 24.4, EMIT[i][1]); rig.add(e); const rodM = new T.Mesh(new T.CylinderGeometry(.05, .05, 3.6, 5), dark); rodM.position.y = 1.9; e.add(rodM); const box = new T.Mesh(new T.BoxGeometry(.5, .35, .6), dark); box.position.y = -.1; e.add(box); emitters.push(e) }
for (let i = 0; i < NL; i++) { const e = emitters[i % emitters.length], piv = new T.Group(); e.add(piv); const m = new T.Mesh(laserGeo, addMat(0x39ff6a, .85)); m.renderOrder = 5; piv.add(m); lasers.push({ aimable: true, id: i, node: piv, o: e.position, piv, m, i, e }) }
const spots = [];
for (let i = 0; i < 10; i++) { const s = new T.Mesh(new T.CircleGeometry(1, 20), addMat(0xffffff, .5)); s.rotation.x = -PI / 2; s.position.y = .06; s.renderOrder = 3; s.visible = false; rig.add(s); spots.push(s) }
const _d = new T.Vector3(), DOWN = new T.Vector3(0, -1, 0), COLS = 7, ROWS = 3, X_MIN = -21.5, X_MAX = 21.5, Z_MIN = -17.5, Z_MAX = 22.5;
function aim(L, tx, ty, tz) { _d.set(tx - L.o.x, ty - L.o.y, tz - L.o.z); L.len = Math.max(1, _d.length()); _d.normalize(); L.q = (L.q || new T.Quaternion()).setFromUnitVectors(DOWN, _d) }
const hashN = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x) };
function aimCell(L, col, row, salt, high) { col = ((col % COLS) + COLS) % COLS; row = ((row % ROWS) + ROWS) % ROWS; const x = X_MIN + (col + hashN(salt, 1)) / COLS * (X_MAX - X_MIN), z = Z_MIN + (row + hashN(salt, 2)) / ROWS * (Z_MAX - Z_MIN); aim(L, x, high ? 7 + hashN(salt, 3) * 14 : hashN(salt, 4) * 3, z) }
// BASS floor cones: wide soft beams standing around the whole perimeter, aimed up and across the room; they only listen to the bass
const subs = [], subGeo = new T.ConeGeometry(1.5, 24, 16, 1, true); subGeo.translate(0, -12, 0);
for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2, x = Math.cos(a) * 21.5, z = 2.5 + Math.sin(a) * 19.5, g = new T.Group(); g.position.set(x, .15, z); rig.add(g); const body = new T.Mesh(new T.CylinderGeometry(.3, .45, .5, 8), dark); body.position.y = .2; g.add(body); const lens = new T.Mesh(new T.CircleGeometry(.28, 12), addMat(0xffffff, .8)); lens.rotation.x = -PI / 2; lens.position.y = .46; g.add(lens); const node = new T.Group(); node.position.y = .45; g.add(node); const beam = new T.Mesh(subGeo, addMat(0xffffff, .1)); beam.renderOrder = 4; node.add(beam); const L = { aimable: true, high: true, id: k, node, o: new T.Vector3(x, .6, z), lens, beam, k }; subs.push(L); L.node.position.set(0, .45, 0); L.o.set(x, .6, z); aim(L, -x * .4, 14, 2.5 - (z - 2.5) * .4); node.quaternion.copy(L.q) }
// SMOKE: CO2 jets standing around the crowd; they fire in random groups on a huge drop
const NP = 9, cannons = [], smokeCol = new T.Color(0xcfd6dc);
for (let k = 0; k < 16; k++) {
  const sp = [[-6, -9.4], [6, -9.4], [-11, -9.4], [11, -9.4]][k - 12], a = k / 12 * PI * 2 + .2, r = k % 2 ? 9.5 : 15, x = sp ? sp[0] : Math.cos(a) * r * 1.25, z = sp ? sp[1] : Math.max(-7.6, Math.sin(a) * r * .95 + 2), g = new T.Group(); g.position.set(x, 0, z); rig.add(g);
  const body = new T.Mesh(new T.BoxGeometry(.7, .55, .6), dark); body.position.y = .28; g.add(body); const noz = new T.Mesh(new T.CylinderGeometry(.09, .13, .6, 8), steel); noz.position.y = .85; g.add(noz); const led = new T.Mesh(new T.CircleGeometry(.08, 8), addMat(0x39ff6a, .9)); led.position.set(0, .3, .31); g.add(led);
  const puffs = []; for (let p = 0; p < NP; p++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xcfd6dc, transparent: true, opacity: 0, depthWrite: false })); sp.visible = false; sp.renderOrder = 7; rig.add(sp); puffs.push({ sp, age: 99, vx: 0, vy: 0, vz: 0, s0: 1 }) }
  cannons.push({ g, x, z, puffs, t0: null, next: 0, led });
}
let lastSmoke = -99;
function fireCannon(c, delay) { c.t0 = performance.now() / 1000 + (delay || 0); c.next = 0 }
function bigDrop(now) {
  if (!cfg.smoke || !cfg.enabled || now - lastSmoke < 6) return; lastSmoke = now; bs.dropFlash = 1; if (cfg.strobeBanks && !reduced()) strobeStart(8, true);
  const idle = cannons.filter(c => c.t0 === null || now - c.t0 > 6), n = Math.min(idle.length, Math.max(2, Math.min(4, Math.round((2 + Math.floor(Math.random() * 3)) * cfg.smokeAmount))));
  for (let k = 0; k < n; k++) { const c = idle.splice(Math.floor(Math.random() * idle.length), 1)[0]; fireCannon(c, Math.random() * .7) }
}
function smokeTick(now, dt, g) {
  const tint = colorAt(an.shift || 0).lerp(smokeCol, .6);
  cannons.forEach(c => {
    const age = c.t0 === null ? -1 : now - c.t0;
    if (age >= 0) { while (c.next < NP && age >= c.next * .1) { const p = c.puffs[c.next++]; p.age = 0; p.vx = (Math.random() - .5) * 1.8; p.vz = (Math.random() - .5) * 1.8; p.vy = 13 + Math.random() * 4; p.s0 = 1 + Math.random() * .4; p.sp.position.set(c.x, 1.1, c.z); p.sp.visible = true }
      if (c.next >= NP && age > 6) c.t0 = null }
    c.led.material.color.setHex(age >= 0 && age < 1.2 ? 0xff3a2a : 0x39ff6a);
    c.puffs.forEach(p => {
      if (!p.sp.visible) return; p.age += dt; const u = p.age / 5; if (u >= 1) { p.sp.visible = false; return }
      const drag = Math.exp(-dt * .9); p.vx *= drag; p.vz *= drag; p.vy *= drag; p.vy -= dt * .5; p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
      p.sp.scale.setScalar(p.s0 + Math.sqrt(u) * 3); p.sp.material.color.copy(tint); p.sp.material.opacity = Math.min(1, p.age * 8) * Math.pow(1 - u, 1.4) * .85 * (.4 + .6 * g);
    });
  });
}
const hits = new T.Vector3(), dirV = new T.Vector3(), originV = new T.Vector3();
// ---- STROBE BANKS: 14 strobe fixtures in 5 zones (west wall, east wall, back wall, front wall, centre truss). A strobe SECTION picks a few zones, a speed that is a multiple of the beat
// (so fast music strobes fast and slow music strobes slow, never faster than cfg.strobeMaxHz), a pattern (all together / chase / alternate / random) and a length in beats, then goes quiet for a random gap.
const ZONES = ['WEST', 'EAST', 'BACK', 'FRONT', 'CENTRE'], MULTS = [.5, 1, 1, 2, 2, 4], PATTERNS = ['sync', 'chase', 'alternate', 'random'];
const SB = [[0, -21.5, 9, -12], [0, -21.5, 9, 0], [0, -21.5, 9, 12], [1, 21.5, 9, -12], [1, 21.5, 9, 0], [1, 21.5, 9, 12], [2, -10, 12, -18.5], [2, 0, 12, -18.5], [2, 10, 12, -18.5], [3, -10, 12, 22.5], [3, 0, 12, 22.5], [3, 10, 12, 22.5], [4, -8, TY - .6, 0], [4, 8, TY - .6, 0]];
const zoneCount = ZONES.map((_, z) => SB.filter(b => b[0] === z).length), zoneSeen = ZONES.map(() => 0);
const banks = SB.map(([zone, x, y, z], i) => {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = Math.atan2(-x, 2 - z); rig.add(g);
  const housing = new T.Mesh(new T.BoxGeometry(1.3, .8, .3), dark); housing.position.z = -.2; g.add(housing);
  const lens = new T.Mesh(new T.PlaneGeometry(1.1, .6), addMat(0xffffff, 0)); lens.position.z = -.03; g.add(lens);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.position.z = .6; glow.renderOrder = 8; g.add(glow);
  return { zone, idx: zoneSeen[zone]++, i, g, lens, glow, v: 0 };
});
const strobe = { active: false, zones: [], mult: 1, pattern: 'sync', endBeat: 0, nextBeat: 8, off: [], label: 'off' };
function strobeStart(len, all) {
  const zs = shuf(ZONES.map((_, i) => i)), n = all ? ZONES.length : 1 + Math.floor(Math.random() * 3);
  strobe.zones = zs.slice(0, n); strobe.mult = all ? 2 : MULTS[Math.floor(Math.random() * MULTS.length)]; strobe.pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  strobe.endBeat = bs.count + len; strobe.active = true; strobe.off = banks.map(() => Math.random()); strobe.label = strobe.zones.map(z => ZONES[z]).join('+') + ' x' + strobe.mult + ' ' + strobe.pattern + ' ' + len + ' beats';
}
// runs on every beat: end the running section, or maybe start a new one
function strobeBeat() {
  const c = bs.count;
  if (strobe.active) { if (c >= strobe.endBeat) { strobe.active = false; strobe.label = 'off'; strobe.nextBeat = c + Math.round((3 + Math.random() * 12) * (1.5 - cfg.strobeDensity)) } return }
  if (!cfg.strobeBanks || !cfg.enabled || reduced() || bs.blackout || bs.rel < .8 || c < strobe.nextBeat) return;
  if (Math.random() > .3 + cfg.strobeDensity * .6) { strobe.nextBeat = c + 2; return }
  strobeStart([2, 4, 4, 8, 8, 16][Math.floor(Math.random() * 6)], false);
}
function strobeDrive(now, dt, g) {
  const per = grid.period || .46, bpm = 60 / per; let mult = strobe.mult; while (bpm / 60 * mult > cfg.strobeMaxHz && mult > .25) mult /= 2;
  const beatPos = bs.count + clamp((now - (bs.beatT || now)) / per, 0, 1.2), allow = strobe.active && cfg.strobeBanks && cfg.enabled && !reduced() && g > .5, duty = cfg.strobeDuty;
  strobe.hz = +(bpm / 60 * mult).toFixed(2);
  banks.forEach(B => {
    let tgt = 0;
    if (allow && strobe.zones.includes(B.zone)) {
      const off = strobe.pattern === 'chase' ? B.idx / Math.max(1, zoneCount[B.zone]) : strobe.pattern === 'alternate' ? (B.i % 2) * .5 : strobe.pattern === 'random' ? strobe.off[B.i] : 0;
      const ph = (((beatPos * mult + off) % 1) + 1) % 1; tgt = ph < duty ? 1 - ph / duty * .45 : 0;
    }
    B.v = Math.max(tgt, B.v * Math.exp(-dt * 45)); const vis = B.v > .01; B.glow.visible = B.lens.visible = vis; if (!vis) return;
    const col = colorAt(B.zone * .7 + (an.shift || 0)).lerp(PRESET_WHITE, .65); B.lens.material.color.copy(col); B.glow.material.color.copy(col);
    B.lens.material.opacity = B.v; B.glow.material.opacity = clamp(B.v * .8 * cfg.strobeBright, 0, 1); B.glow.scale.setScalar(4 + B.v * 6);
  });
}
const PRESET_WHITE = new T.Color(1, 1, 1);
let strobeEl = null;
function strobeDiv() { if (strobeEl) return strobeEl; strobeEl = document.createElement('div'); strobeEl.id = 'rave-strobe'; strobeEl.setAttribute('aria-hidden', 'true'); strobeEl.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;background:#fff;opacity:0;mix-blend-mode:screen'; document.body.append(strobeEl); return strobeEl }
let lastStrobe = -99, burst = 0, burstAt = 0;

// ---- per-frame show ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let clock = 0, lastNow = performance.now() / 1000;
function colorAt(k) { const c = an.colors, n = c.length, f = ((k % n) + n) % n, i = Math.floor(f); return c[i].clone().lerp(c[(i + 1) % n], f - i) }
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x) };
// targets only change ON a beat: heads take turns (even heads on one kick, odd heads on the next), lasers all jump to the next step of the current pattern
function onBeat() {
  const st = bs.step;
  if (st % 8 === 0) { const p = PRESETS[an.preset].patterns; an.pattern = p[(Math.floor(hash(st, 3) * p.length)) % p.length] }
  if (cfg.diversify && bs.count - (assign.last || 0) >= 32) assign();
  strobeBeat();
  if (bs.bar !== an.lastBar) { an.lastBar = bs.bar; an.shift = (an.shift || 0) + 1 }
}
function drive() {
  const now = performance.now() / 1000, dt = Math.min(.1, now - lastNow); lastNow = now;
  const live = playing && !audio.paused, on = cfg.enabled && live, g = on ? bs.gate : 0, shift = an.shift || 0, snap = 1 - Math.exp(-dt * 16);
  for (let i = 0; i < an.colors.length; i++) an.colors[i].lerp(an.target[i], Math.min(1, dt * 1.2 * cfg.colorSpeed));
  const kick = Math.min(1, bs.pulse + bs.drop * .6), bright = cfg.beamBrightness;
  const bassLvl = clamp(an.bass * 1.15, 0, 1), trebLvl = clamp(an.high * 1.1, 0, 1), flash = bs.dropFlash || 0; bs.dropFlash = flash * Math.exp(-dt * 2);
  // every light flashes only when ITS band hits (L.p jumps to 1 on the hit and fades at a rate that suits the band)
  for (const L of allLights()) L.p = (L.p || 0) * Math.exp(-dt * DECAY[L.band ?? 1]);
  heads.forEach((h, i) => {
    h.beam.visible = h.lens.visible = cfg.beams && cfg.enabled; if (!h.beam.visible) return;
    if (!h.q) aimCell(h, i * 3, i, i * 5, false); h.node.quaternion.slerp(h.q, snap); { const k = h.len / BEAM_LEN; h.beam.scale.y += (k - h.beam.scale.y) * snap; h.beam.scale.x = h.beam.scale.z = h.beam.scale.y }
    const power = g * (.015 + .985 * Math.min(1, h.p + flash * .5 + bs.drop * .5)), col = colorAt(i * .37 + h.band * .5 + shift);
    h.lens.material.color.copy(col); h.beam.material.color.copy(col); h.lens.material.opacity = clamp(power * 1.1, 0, 1); h.beam.material.opacity = clamp(power * .2 * bright, 0, .4);
  });
  subs.forEach((L, k) => {
    L.beam.visible = L.lens.visible = cfg.beams && cfg.enabled; if (!L.beam.visible) return;
    if (!L.hasAim) { L.hasAim = true } L.node.quaternion.slerp(L.q, snap * .7); const col = colorAt(k * .3 + L.band * .5 + shift + 1.5), power = g * (.015 + .985 * Math.min(1, L.p + flash * .5));
    L.lens.material.color.copy(col); L.beam.material.color.copy(col); L.lens.material.opacity = clamp(power, 0, 1); L.beam.material.opacity = clamp(power * .13 * bright, 0, .3);
  });
  const count = clamp(Math.round(cfg.laserCount), 0, NL), th = cfg.laserThickness;
  lasers.forEach((L, i) => {
    const vis = cfg.lasers && cfg.enabled && i < count && g > .02; L.m.visible = vis; if (!vis) return;
    if (!L.q) aimCell(L, i, i * 2, i * 7 + 3, false); L.node.quaternion.slerp(L.q, 1 - Math.exp(-dt * 24));
    L.m.scale.set(th * (1 + L.p * .8), 1, th * (1 + L.p * .8)); L.m.material.color.copy(colorAt(i * .21 + L.band * .6 + shift + 2)); L.m.material.opacity = clamp(g * (.03 + .97 * L.p) * bright, 0, 1);
  });
  smokeTick(now, dt, g);
  strobeDrive(now, dt, g);
  // floor bursts follow the laser hits and flash with the kick
  spots.forEach((s, j) => {
    const L = lasers[Math.floor(j * (count / Math.max(1, spots.length)))], vis = cfg.floor && cfg.enabled && L && L.m.visible; s.visible = !!vis; if (!vis) return;
    L.piv.updateWorldMatrix(true, false); originV.setFromMatrixPosition(L.piv.matrixWorld); dirV.set(0, -1, 0).transformDirection(L.piv.matrixWorld);
    if (dirV.y > -.05) { s.visible = false; return } const tt = originV.y / -dirV.y; hits.copy(originV).addScaledVector(dirV, tt); rig.worldToLocal(hits); s.position.set(hits.x, .06, hits.z);
    s.scale.setScalar(.6 + L.p * 1.6); s.material.color.copy(L.m.material.color); s.material.opacity = clamp(g * (.04 + .86 * L.p), 0, .9);
  });
  // the room lights: floodlights and neon go nearly dark in a blackout and punch on the kick
  Y.floodLights?.forEach((f, i) => { const c = colorAt(i * .5 + shift); f.light.color.copy(on ? c.clone().lerp(new T.Color(f.color), .3) : new T.Color(f.color)); f.p = (f.p || 0) * Math.exp(-dt * DECAY[f.band ?? 1]); const fk = Math.min(1, f.p); const p = on ? .06 + g * (.2 + 1.35 * fk) : 1; f.light.intensity = f.base * p; f.cone.material.color.copy(f.light.color); f.cone.material.opacity = (f.base > 60 ? .07 : .05) * (on ? .1 + g * (.4 + 1.5 * fk) : 1) });
  show.neonBoost = on ? .22 + g * (.45 + .8 * kick) : 1;
  // strobes: rare. Only when the music hits an extreme transient (far above its own running statistics) at full loudness; the rarity setting raises both the threshold and the cooldown.
  // A burst is at most 3 flashes, 0.34 s apart, at low opacity.
  const ra = cfg.strobeRarity, need = 2 + ra * 3.2, gap = 2 + ra * 45;
  if (cfg.strobes && cfg.enabled && !reduced() && live && g > .8 && bs.zOn > need && bs.rel > .8 && now - lastStrobe > gap && !burst) { lastStrobe = now; burst = 3; burstAt = 0 }
  if (burst && now >= burstAt) { burst--; burstAt = now + .34; const el = strobeDiv(); el.style.transition = 'none'; el.style.opacity = String(.2 * cfg.strobe * PRESETS[an.preset].strobe); requestAnimationFrame(() => { el.style.transition = 'opacity .12s ease-out'; el.style.opacity = '0' }) }
  show.stats = { section: an.section, preset: PRESETS[an.preset].name, pattern: an.pattern, bpm: Math.round(an.bpm), bass: +an.bass.toFixed(2), mid: +an.mid.toFixed(2), high: +an.high.toFixed(2), gate: +bs.gate.toFixed(2), rel: +bs.rel.toFixed(2), strobe: strobe.active ? strobe.label + ' @' + strobe.hz + 'Hz' : 'off', beats: bs.count, bands: band.map(B => B.hits + (B.pulse > .5 ? '*' : '')).join(' '), sync: Math.round(syncDelay() * 1000), zOn: +bs.zOn.toFixed(1), conf: +grid.conf.toFixed(2), period: +grid.period.toFixed(3), time: Math.round(audio.currentTime || 0), playing: live };
}
show.cfg = cfg; show.beatState = bs; show.grid = grid; show.cannons = cannons; show.PRESETS = PRESETS; show.neonBoost = 1; show.stats = {};
assign();
let aLast = performance.now() / 1000; setInterval(() => { const now = performance.now() / 1000, dt = Math.min(.1, now - aLast); aLast = now; try { analyse(now, dt) } catch (e) { if (!analyse.w) { analyse.w = true; console.warn('[rave-show] analysis', e) } } }, 12);
const orig = MM.update;
MM.update = function (dt, t) {
  if (W.root.visible && yard.visible) { rig.visible = true; try { drive() } catch (e) { if (!drive.w) { drive.w = true; console.warn('[rave-show]', e) } } } else rig.visible = false;
  return orig.call(this, dt, t);
};
document.addEventListener('ashfall-entry-state', e => { const s = e.detail?.state; if (s === 'MENU') stopMusic(); else if (s === 'TRANSITION_IN' || s === 'DOORS_OPENING' || s === 'WALKING' || s === 'IN_WORLD') { if (cfg.enabled) startMusic() } });
Object.assign(show, { strobeNow: () => { if (!reduced()) strobeStart(8, false) }, strobeState: strobe, banks, reshuffle: () => assign(), band, fireSmoke: () => { lastSmoke = -99; bigDrop(performance.now() / 1000) }, flashStrobe: () => { lastStrobe = -99; burst = 3; burstAt = 0 }, start: startMusic, stop: stopMusic, skipPreset: () => choosePreset('DROP'), restart: () => { audio.currentTime = 0; reset() }, audio, analysis: an });
Object.defineProperty(show, 'playing', { get() { return playing && !audio.paused } });
window.AshfallRaveShow = show;
})();
