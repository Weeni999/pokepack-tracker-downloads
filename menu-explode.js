/* MENU EXPLODE: clicking COCKPIT in the lobby menu blows the three menu signs (COCKPIT, OPTIONS, EXIT GAME) apart and you are in the game that same frame: no camera flight, no tunnel,
   no fade. Each neon letter becomes a fragment that flies outward, tumbles and fades, with a spark burst, a flash of light and a boom. The signs stay hidden while you play and
   are rebuilt when you come back to the menu. The signs' point lights stay in the scene (at zero) so the light count never changes and there is no shader recompile on entry. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, Y = window.AshfallYardDressing, MM = window.AshfallMainMenu;
if (!hub || !T || !Y?.menuSigns || !MM || typeof MM.update !== 'function') return;
const D = Y.group, frags = [], flashes = [], reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || window.AshfallSettings?.state?.reduceMotion;
const entryFor = g => Y.signs.find(s => s.group === g);

// ---- sparks (one pool shared by the three signs) ------------------------------------------------------------------------------------------------------------------------------------------------------------
const N = 360, pos = new Float32Array(N * 3).fill(-80), vel = new Float32Array(N * 3), age = new Float32Array(N).fill(99), life = new Float32Array(N), colr = new Float32Array(N * 3);
const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(colr, 3));
const sparks = new T.Points(geo, new T.PointsMaterial({ size: .22, vertexColors: true, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); sparks.frustumCulled = false; D.add(sparks);
let cur = 0;
function burst(center, color, n) { const c = new T.Color(color); for (let i = 0; i < n; i++) { const k = cur = (cur + 1) % N, d = new T.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).normalize().multiplyScalar(4 + Math.random() * 9); pos.set([center.x, center.y, center.z], k * 3); vel.set([d.x, d.y + 2, d.z], k * 3); colr.set([c.r, c.g, c.b], k * 3); life[k] = .5 + Math.random() * .9; age[k] = 0 } geo.attributes.color.needsUpdate = true }

// ---- boom ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function boom() {
  try {
    const S = window.AshfallSettings; if (!S || S.state.mute) return; S.setEnvironmentMode?.(false); const a = S.audio, ctx = a?.context; if (!ctx) return; ctx.resume?.(); const t = ctx.currentTime, out = ctx.createGain(); out.gain.value = .9; out.connect(a.sfx || a.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate * .9, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const n = ctx.createBufferSource(); n.buffer = nb; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(180, t + .8); const ng = ctx.createGain(); ng.gain.value = .8; n.connect(lp); lp.connect(ng); ng.connect(out); n.start(t);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(30, t + .5); og.gain.setValueAtTime(.9, t); og.gain.exponentialRampToValueAtTime(.001, t + .6); o.connect(og); og.connect(out); o.start(t); o.stop(t + .7);
    for (let i = 0; i < 6; i++) { const at = t + .04 + Math.random() * .25, c = ctx.createOscillator(), cg = ctx.createGain(); c.type = 'square'; c.frequency.setValueAtTime(1800 + Math.random() * 1800, at); c.frequency.exponentialRampToValueAtTime(300, at + .08); cg.gain.setValueAtTime(.06, at); cg.gain.exponentialRampToValueAtTime(.001, at + .1); c.connect(cg); cg.connect(out); c.start(at); c.stop(at + .12) }
  } catch {}
}

// ---- the explosion ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c) })();
const wp = new T.Vector3(), wq = new T.Quaternion(), ws = new T.Vector3();
function explodeSign(g, color) {
  g.updateWorldMatrix(true, true); const center = g.getWorldPosition(new T.Vector3());
  g.traverse(o => {
    if (!o.isMesh || !o.material?.map) return;                               // letter planes only (the halo has a map too but is not a letter: skip very wide planes)
    const w = o.geometry.parameters?.width; if (w && w > 2.2 && o.geometry.parameters.height < 1.2) return;
    o.getWorldPosition(wp); o.getWorldQuaternion(wq); o.getWorldScale(ws);
    const m = new T.Mesh(o.geometry, o.material.clone()); m.material.opacity = 1; m.position.copy(wp); m.quaternion.copy(wq); m.scale.copy(ws); m.renderOrder = 9; D.add(m);
    const dir = wp.clone().sub(center); dir.y += .4; dir.add(new T.Vector3((Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3)).normalize().multiplyScalar(5 + Math.random() * 7);
    frags.push({ m, v: dir, spin: new T.Vector3((Math.random() - .5) * 14, (Math.random() - .5) * 14, (Math.random() - .5) * 14), t: 0, life: .7 + Math.random() * .5 });
  });
  burst(center, color, 120);
  const l = new T.Sprite(new T.SpriteMaterial({ map: flashTex, color, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 1 })); l.position.copy(center); l.scale.setScalar(4); D.add(l); flashes.push({ l, t: 0 });   // a sprite, not a light: the light count must not change
  return center;
}
function setVisible(on) {
  for (const k of ['cockpit', 'options', 'exit']) { const g = Y.menuSigns[k].group, e = entryFor(g); g.traverse(o => { if (o.isMesh) o.visible = on }); if (e) e.base = on ? e.baseOrig : 0 }
}
let armed = false;
function play() {
  if (!armed) return; armed = false; if (reduced()) { setVisible(false); return }
  explodeSign(Y.menuSigns.cockpit.group, 0x39ff6a); explodeSign(Y.menuSigns.options.group, 0x6dff7a); explodeSign(Y.menuSigns.exit.group, 0xff6a4a);
  setVisible(false); boom();
}
document.addEventListener('ashfall-entry-state', e => { const s = e.detail?.state; if (s === 'MENU') { setVisible(true); armed = true } else if (s !== 'PAUSED') setVisible(false) });
armed = true;

const orig = MM.update; let last = performance.now() / 1000;
MM.update = function (dt, t) {
  const now = performance.now() / 1000, d = Math.min(.05, now - last); last = now;
  for (let i = frags.length - 1; i >= 0; i--) { const f = frags[i]; f.t += d; const k = f.t / f.life; f.v.y -= 9 * d; f.m.position.addScaledVector(f.v, d); f.m.rotation.x += f.spin.x * d; f.m.rotation.y += f.spin.y * d; f.m.rotation.z += f.spin.z * d; f.m.material.opacity = Math.max(0, 1 - k * k); if (k >= 1) { D.remove(f.m); f.m.material.dispose(); frags.splice(i, 1) } }
  for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.t += d; const k = Math.min(1, f.t / .4); f.l.material.opacity = 1 - k; f.l.scale.setScalar(4 + k * 16); if (k >= 1) { D.remove(f.l); f.l.material.dispose(); flashes.splice(i, 1) } }
  let live = false; for (let i = 0; i < N; i++) { if (age[i] >= life[i]) { if (pos[i * 3 + 1] > -70) pos[i * 3 + 1] = -80; continue } live = true; age[i] += d; vel[i * 3 + 1] -= 9 * d; pos[i * 3] += vel[i * 3] * d; pos[i * 3 + 1] += vel[i * 3 + 1] * d; pos[i * 3 + 2] += vel[i * 3 + 2] * d } if (live) geo.attributes.position.needsUpdate = true;
  return orig.call(this, dt, t);
};
window.AshfallMenuExplode = { play, get active() { return frags.length > 0 } };
})();
