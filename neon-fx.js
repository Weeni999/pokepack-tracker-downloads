/* NEON FX: sparks spit out of the neon signs now and then (COCKPIT / OPTIONS / EXIT GAME / CUSTOMIZE / BETTING and the big rooster on the back wall), like tired, overloaded tubes.
   Every few seconds a random sign throws a short burst: a fan of hot sparks that arc away from the wall and fall, while the sign dips for a moment as if it shorted out.
   One pooled Points object, no scene lights. Controls: dev menu (9) > NEON. */
(() => {
'use strict';
const T = window.THREE, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu, Y = window.AshfallYardDressing;
if (!T || !W?.yard || !MM || typeof MM.update !== 'function' || !Y?.signs) return;
const yard = W.yard, N = 700;
const cfg = { enabled: true, rate: 14, amount: 1, speed: 5, gravity: 9, life: 1.1, size: .45, colour: 'sign', rooster: true, dip: true };
const pos = new Float32Array(N * 3).fill(-50), vel = new Float32Array(N * 3), col = new Float32Array(N * 3), base = new Float32Array(N * 3), age = new Float32Array(N).fill(99), life = new Float32Array(N).fill(1);
const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.boundingSphere = new T.Sphere(new T.Vector3(0, 10, -60), 200);
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); const t = new T.CanvasTexture(c); return t })();
const mat = new T.PointsMaterial({ size: cfg.size, map: dot, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true });
const pts = new T.Points(geo, mat); pts.name = 'NEON_SPARKS'; pts.frustumCulled = false; pts.renderOrder = 8; yard.add(pts);
let cursor = 0, last = performance.now() / 1000;
const v = new T.Vector3(), o = new T.Vector3(), out = new T.Vector3(), tint = new T.Color(), PRESET = { electric: new T.Color(.75, .9, 1), hot: new T.Color(1, .55, .15), white: new T.Color(1, 1, 1) };
const rooster = () => window.AshfallBackWallNeon?.group;
// every sign that is currently on (the menu signs are switched off while you play) plus the rooster
function sources() {
  const list = Y.signs.filter(s => s.base > 0 && s.group.visible).map(s => ({ g: s.group, w: s.group.userData.w || 4, h: s.group.userData.h || 1.2, sign: s, color: s.light.color }));
  const r = rooster(); if (cfg.rooster && r?.visible) list.push({ g: r, w: 12, h: 14, sign: null, color: new T.Color(.4, 1, .55) });
  return list;
}
function emit(src, n) {
  src.g.updateWorldMatrix(true, false);
  const px = (Math.random() - .5) * src.w * .85, py = (Math.random() - .5) * src.h * .9;
  o.set(px, py, .12).applyMatrix4(src.g.matrixWorld); yard.worldToLocal(o);
  if (cfg.colour === 'sign') tint.copy(src.color).lerp(PRESET.white, .55); else tint.copy(PRESET[cfg.colour] || PRESET.white);
  src.g.getWorldPosition(v); out.set(0, 0, 1).transformDirection(src.g.matrixWorld); const w1 = v.clone().add(out); yard.worldToLocal(v); yard.worldToLocal(w1); const out2 = w1.sub(v).normalize();
  for (let i = 0; i < n; i++) {
    const k = cursor = (cursor + 1) % N, sp = cfg.speed * (.25 + Math.random() * .85);
    pos[k * 3] = o.x + (Math.random() - .5) * .25; pos[k * 3 + 1] = o.y + (Math.random() - .5) * .25; pos[k * 3 + 2] = o.z + (Math.random() - .5) * .25;
    vel[k * 3] = out2.x * sp + (Math.random() - .5) * sp * .9; vel[k * 3 + 1] = out2.y * sp + (Math.random() - .2) * sp * .8; vel[k * 3 + 2] = out2.z * sp + (Math.random() - .5) * sp * .9;
    base[k * 3] = tint.r; base[k * 3 + 1] = tint.g; base[k * 3 + 2] = tint.b; age[k] = 0; life[k] = cfg.life * (.45 + Math.random() * .8);
  }
  if (cfg.dip && src.sign) { const now = performance.now() / 1000; src.sign.until = now + .12 + Math.random() * .25; const l = src.sign.letters[Math.floor(Math.random() * src.sign.letters.length)]; if (l) { l.burstEnd = now + .15 + Math.random() * .3; l.nextDrop = now + 2 + Math.random() * 6 } }
}
function burst(src) { emit(src, Math.max(1, Math.round((10 + Math.random() * 14) * cfg.amount))) }
let timers = new WeakMap();
function tick(now, dt) {
  mat.size = cfg.size;
  if (cfg.enabled && cfg.rate > 0) for (const s of sources()) {
    let t = timers.get(s.g); if (t === undefined) { t = now + Math.random() * 60 / cfg.rate; timers.set(s.g, t) }
    if (now >= t) { burst(s); timers.set(s.g, now - Math.log(1 - Math.random()) * 60 / cfg.rate + .4) }
  }
  for (let i = 0; i < N; i++) {
    if (age[i] >= life[i]) { if (pos[i * 3 + 1] > -40) { pos[i * 3 + 1] = -50; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0 } continue }
    age[i] += dt; vel[i * 3 + 1] -= cfg.gravity * dt; const d = Math.exp(-dt * .8); vel[i * 3] *= d; vel[i * 3 + 2] *= d;
    pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    if (pos[i * 3 + 1] < .03) { pos[i * 3 + 1] = .03; vel[i * 3 + 1] *= -.35 }
    const f = 1 - age[i] / life[i], tw = .6 + .4 * Math.random(); col[i * 3] = base[i * 3] * f * tw; col[i * 3 + 1] = base[i * 3 + 1] * f * tw; col[i * 3 + 2] = base[i * 3 + 2] * f * tw;
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
}
const orig = MM.update;
MM.update = function (dt, t) {
  if (W.root.visible && yard.visible) { pts.visible = true; const now = performance.now() / 1000, d = Math.min(.1, now - last); last = now; try { tick(now, d) } catch (e) { if (!tick.w) { tick.w = true; console.warn('[neon-fx]', e) } } } else { pts.visible = false; last = performance.now() / 1000 }
  return orig.call(this, dt, t);
};
window.AshfallNeonFX = { cfg, burst: () => { for (const s of sources()) burst(s) }, sources };
})();
