/* MENU GATE: clicking the COCKPIT sign swings the chain-link fence behind the menu open as a heavy double gate (dust at the base, grinding metal),
   dollies the menu camera straight through the opening, and hands the camera over to the existing entry sequence, which keeps flying it into the world.
   No loading screen and no black fade: the last menu frame is cross-dissolved into the world. Reduced motion skips the cinematic. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, CM = window.AshfallCinematicMenu, MM = window.AshfallMainMenu;
if (!hub || !T || !CM || !MM || typeof MM.update !== 'function') return;
const root = hub.scene.getObjectByName('COCKPIT_CINEMATIC_SET');
if (!root) return;
const PI = Math.PI, GATE_Z = -7.2, HINGE = 3.7, OPEN_DEG = 105;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || window.AshfallSettings?.state?.reduceMotion;
const clamp01 = v => Math.max(0, Math.min(1, v)), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, easeOut = t => 1 - Math.pow(1 - t, 3);

// ---- locate the original back fence, replace it with fixed side sections + two swinging leaves -------------------------------------------------------------------------
let fenceOrig = null;
root.traverse(o => { if (o.isMesh && o.geometry?.type === 'BufferGeometry' && Math.abs(o.position.z - GATE_Z) < .01) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; if (b.max.x - b.min.x > 20 && b.max.y - b.min.y > 8) fenceOrig = o } });
if (!fenceOrig) return;
const steel = fenceOrig.material;
function wire(w, h) {
  const gs = [], sp = .38;
  for (const slope of [-1, 1]) for (let k = -w / 2 - h; k <= w / 2 + h; k += sp) {
    const lo = Math.max(0, slope === 1 ? -w / 2 - k : k - w / 2), hi = Math.min(h, slope === 1 ? w / 2 - k : k + w / 2); if (hi <= lo) continue;
    const pts = [], n = Math.ceil((hi - lo) * 9);
    for (let i = 0; i <= n; i++) { const y = lo + (hi - lo) * i / n; pts.push(new T.Vector3(k + slope * y, y, Math.sin(y * PI / sp) * .024 * slope)) }
    gs.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts), Math.max(4, n), .012, 4, false));
  }
  const pos = [], nor = [], uv = [], ind = []; let off = 0;
  for (const g of gs) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array); for (const i of g.index.array) ind.push(i + off); off += g.attributes.position.count; g.dispose() }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ind); g.computeBoundingSphere();
  const m = new T.Mesh(g, steel); m.castShadow = true; m.receiveShadow = true; return m;
}
const frameMat = new T.MeshStandardMaterial({ color: 0x4d575d, roughness: .5, metalness: .75 });
const bar = (parent, w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), frameMat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m };
const gate = new T.Group(); gate.name = 'MENU_GATE'; root.add(gate);
const H = 8.9;
for (const s of [-1, 1]) { const f = wire(7.3, H); f.position.set(s * 7.35, 0, GATE_Z); gate.add(f) }
const leaves = [-1, 1].map(s => {
  const pivot = new T.Group(); pivot.position.set(s * HINGE, 0, GATE_Z); gate.add(pivot);
  const mesh = wire(HINGE, H); mesh.position.x = -s * HINGE / 2; pivot.add(mesh);
  const cx = -s * HINGE / 2;
  bar(pivot, HINGE, .2, .24, cx, 8.55, 0); bar(pivot, HINGE, .22, .24, cx, .55, 0); bar(pivot, HINGE, .16, .2, cx, 4.5, 0);
  bar(pivot, .22, H, .26, -s * (HINGE - .05), H / 2, 0);                              // free edge post
  const brace = bar(pivot, .08, 9.5, .08, cx, 4.45, .05); brace.rotation.z = Math.atan2(HINGE, 7.9) * s * -1;
  const hinge = new T.Mesh(new T.CylinderGeometry(.13, .13, H, 12), frameMat); hinge.position.set(0, H / 2, 0); pivot.add(hinge);
  return { pivot, s };
});
fenceOrig.parent.remove(fenceOrig); fenceOrig.geometry.dispose();
// the centre post, its ties and bolts sat where the gate closes: remove them so the leaves meet cleanly
root.traverse(o => { if (o !== gate && !gate.children.includes(o) && o.isMesh && Math.abs(o.position.x) < .05 && Math.abs(o.position.z - GATE_Z) < .35 && o.geometry?.type !== 'BufferGeometry') o.visible = false });

// ---- dust ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const N = 320, dpos = new Float32Array(N * 3).fill(-50), vel = new Float32Array(N * 3), life = new Float32Array(N), age = new Float32Array(N).fill(99);
const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dpos, 3));
const dc = document.createElement('canvas'); dc.width = dc.height = 64; { const g = dc.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64) }
const dust = new T.Points(dg, new T.PointsMaterial({ map: new T.CanvasTexture(dc), color: 0xbdb39a, size: 1.5, transparent: true, opacity: .42, depthWrite: false, sizeAttenuation: true }));
dust.frustumCulled = false; dust.visible = false; root.add(dust);
let cursor = 0;
function spawn(count, spread) {
  for (let i = 0; i < count; i++) {
    const k = cursor = (cursor + 1) % N, side = Math.random() < .5 ? -1 : 1;
    dpos[k * 3] = (Math.random() * 2 - 1) * spread; dpos[k * 3 + 1] = .05 + Math.random() * .25; dpos[k * 3 + 2] = GATE_Z + (Math.random() - .5) * 1.4;
    vel[k * 3] = side * (.15 + Math.random() * .5) * (Math.abs(dpos[k * 3]) > 1 ? Math.sign(dpos[k * 3]) * side : 1); vel[k * 3 + 1] = .25 + Math.random() * .55; vel[k * 3 + 2] = -.6 - Math.random() * 1.4;
    life[k] = 1.6 + Math.random() * 1.8; age[k] = 0;
  }
}
function stepDust(dt) {
  let live = false;
  for (let k = 0; k < N; k++) {
    if (age[k] >= life[k]) { if (dpos[k * 3 + 1] > -40) dpos[k * 3 + 1] = -50; continue }
    live = true; age[k] += dt; const drag = Math.exp(-dt * 1.3);
    vel[k * 3] *= drag; vel[k * 3 + 1] = vel[k * 3 + 1] * drag - dt * .05; vel[k * 3 + 2] *= drag;
    dpos[k * 3] += vel[k * 3] * dt; dpos[k * 3 + 1] += vel[k * 3 + 1] * dt; dpos[k * 3 + 2] += vel[k * 3 + 2] * dt;
  }
  dg.attributes.position.needsUpdate = true; dust.visible = live || st !== null;
}

// ---- sound: noise grind + sub saw + screeching hinge + final clank, routed through the game's sfx bus (so MIX / mute apply) ---------------------------------------------------------------
function grind() {
  try {
    const S = window.AshfallSettings; if (!S || S.state.mute) return;
    S.setEnvironmentMode?.(false);                                            // makes sure the shared audio context exists
    const a = S.audio, ctx = a?.context; if (!ctx) return; ctx.resume?.();
    const t = ctx.currentTime, out = ctx.createGain(); out.gain.value = .9; out.connect(a.sfx || a.master);
    const nbuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = nbuf.getChannelData(0); let b0 = 0; for (let i = 0; i < d.length; i++) { b0 = (b0 + .04 * (Math.random() * 2 - 1)) / 1.04; d[i] = b0 * 5 }
    const noise = ctx.createBufferSource(); noise.buffer = nbuf; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2; bp.frequency.setValueAtTime(220, t); bp.frequency.exponentialRampToValueAtTime(110, t + 3);
    const ng = ctx.createGain(); ng.gain.setValueAtTime(.0001, t); ng.gain.linearRampToValueAtTime(.5, t + .35); ng.gain.setValueAtTime(.5, t + 2.4); ng.gain.exponentialRampToValueAtTime(.0001, t + 3.1);
    const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 7.5; tg.gain.value = .22; trem.connect(tg); tg.connect(ng.gain);
    noise.connect(bp); bp.connect(ng); ng.connect(out); noise.start(t); noise.stop(t + 3.2); trem.start(t); trem.stop(t + 3.2);
    for (const [f0, f1, v] of [[52, 36, .28], [53.4, 37, .22]]) { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 3); lp.type = 'lowpass'; lp.frequency.value = 260; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .4); g.gain.setValueAtTime(v, t + 2.4); g.gain.exponentialRampToValueAtTime(.0001, t + 3.1); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 3.2) }
    for (let i = 0; i < 6; i++) { const at = t + .3 + i * .42 + Math.random() * .2, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'square'; const f0 = 820 + Math.random() * 500; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f0 * .62, at + .5); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 5; g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(.05, at + .06); g.gain.exponentialRampToValueAtTime(.0001, at + .55); o.connect(f); f.connect(g); g.connect(out); o.start(at); o.stop(at + .6) }
    const ct = t + 2.75, co = ctx.createOscillator(), cg = ctx.createGain(); co.type = 'sine'; co.frequency.setValueAtTime(120, ct); co.frequency.exponentialRampToValueAtTime(38, ct + .5); cg.gain.setValueAtTime(.0001, ct); cg.gain.linearRampToValueAtTime(.7, ct + .01); cg.gain.exponentialRampToValueAtTime(.0001, ct + .7); co.connect(cg); cg.connect(out); co.start(ct); co.stop(ct + .8);
  } catch (e) { console.warn('[menu-gate] audio', e) }
}

// ---- sequence -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const cam = { pos: new T.Vector3(0, 3.4, 16), look: new T.Vector3(0, 3.2, -6) };
let st = null, angle = 0, lastSpawn = 0, clanked = false;
const setLeaves = a => { for (const l of leaves) l.pivot.rotation.y = l.s === -1 ? a : -a };         // left leaf swings +, right leaf -, both away from the camera
const style = document.createElement('style'); style.textContent = 'body.menu-gate-playing #cinematic-controls{opacity:0;pointer-events:none;transition:opacity .3s}#menu-gate-fade{position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;opacity:1;transition:opacity .9s ease-out}'; document.head.append(style);

function play() { return false; }
function handoff() {
  st.handed = true;
  // the last menu frame was copied to a half-size 2D canvas one frame earlier (see step); cross-dissolve it over the world
  const f = st.snap;
  if (f) { f.id = 'menu-gate-fade'; document.body.append(f) }
  if (f) requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = '0'; setTimeout(() => f.remove(), 1100) }));
  CM.camOverride = null; document.body.classList.remove('menu-gate-playing'); window.AshfallEntrySequence?.begin();
}
function step(dt) {
  dt = Math.min(.05, dt || 0);
  if (st) {
    st.t += dt; const t = st.t;
    angle = easeOut(clamp01((t - .35) / 2.6)) * OPEN_DEG * PI / 180; if (t > .35 && t < 1.4) angle += Math.sin(t * 38) * .008;   // grinding shudder while it breaks free
    setLeaves(angle);
    if (t > .35 && t < 2.9 && t - lastSpawn > .035) { lastSpawn = t; spawn(5, HINGE) }
    if (!clanked && t > 2.8) { clanked = true; spawn(60, HINGE + .5) }
    const u = clamp01((t - 1.0) / 3.3), k = ease(u);
    cam.pos.set(0, 3.4 - 1.0 * k, 16 - 25 * k); cam.look.set(0, 3.1 - .5 * k, -6 - 14 * k);
    if (u >= 1 && !st.handed) {
      // frame N: ask for a copy after the renderer has drawn (a rAF callback registered now runs after the next scene render); frame N+2: hand off
      if (!st.snapAsked) { st.snapAsked = true; requestAnimationFrame(() => { try { const c = document.createElement('canvas'); c.width = 640; c.height = 360; c.getContext('2d').drawImage(hub.renderer.domElement, 0, 0, 640, 360); st.snap = c } catch { st.snap = null } st.snapDone = true }) }
      else if (st.snapDone) { handoff(); st = null }
    }
  } else if (!CM.active && angle > 0) { angle = 0; setLeaves(0) }        // back on the menu later: the gate is shut again
  stepDust(dt);
}
const orig = MM.update;
MM.update = function (dt, t) { step(dt); return orig.call(this, dt, t) };
window.AshfallMenuGate = { play, get playing() { return !!st }, get open() { return angle > 0 } };
})();
