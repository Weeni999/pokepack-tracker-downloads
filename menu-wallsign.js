/* MENU WALL SIGN: a real neon sign (OPTIONS over EXIT GAME) bolted beside the left fence column, replacing the old floating hologram.
   Hollow neon-tube letters with no backing panel, each letter flickers on its own (one is a dying tube), and the sign throws real light on the fence, floor and haze.
   It re-uses the hologram's own group so the invisible OPTIONS / EXIT GAME click areas projected by cinematic-menu.js (local x -1.6..1.6, OPTIONS y 0.02..0.59,
   EXIT GAME y -0.59..-0.02) land on the two words. Nothing else in the cockpit set is touched. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, CM = window.AshfallCinematicMenu, MM = window.AshfallMainMenu;
if (!hub || !T || !CM || !MM || typeof MM.update !== 'function') return;
const root = hub.scene.getObjectByName('COCKPIT_CINEMATIC_SET');
if (!root) return;
const G = root.children.find(c => c.type === 'Group' && Math.abs(c.position.x + 5.2) < .05 && Math.abs(c.position.z - 2.6) < .05);
if (!G) return;
const PI = Math.PI, S = 1.5, YAW = .24;

// ---- clear the hologram (panel, projection rays, emitter, light) ---------------------------------------------------------------------------------------------------------------------
for (const ch of [...G.children]) { G.remove(ch); ch.traverse(o => { o.geometry?.dispose?.(); const m = o.material; for (const mm of Array.isArray(m) ? m : m ? [m] : []) mm.dispose?.() }) }
for (const o of [...root.children]) if (o.isLight && o.parent === root && Math.abs(o.position.x - G.position.x) < 1 && Math.abs(o.position.z - G.position.z) < 1.5 && o.color.g > .9 && o.color.r < .4) root.remove(o);

// ---- placement: nearly face-on to the camera (a slight turn toward it), its left end clamped to the fence column at x = -11, z = -1 ---------------------------------------------------
// local (-2.15, 0, -.12) is the column centre; solve the group position so that point lands on the column.
{ const px = -2.15, pz = -.12, c = Math.cos(YAW), s = Math.sin(YAW), ox = (px * c + pz * s) * S, oz = (-px * s + pz * c) * S; G.position.set(-11 - ox, 3.2, -1 - oz) }
G.rotation.set(0, YAW, .012); G.scale.setScalar(S);

// ---- materials and helpers ------------------------------------------------------------------------------------------------------------------------------------------------------------------
const steel = new T.MeshStandardMaterial({ color: 0x3b444a, roughness: .55, metalness: .8 }), dark = new T.MeshStandardMaterial({ color: 0x14181a, roughness: .7, metalness: .6 }), rust = new T.MeshStandardMaterial({ color: 0x5a4030, roughness: .9, metalness: .4 }), brass = new T.MeshStandardMaterial({ color: 0x7a6a3a, roughness: .5, metalness: .8 });
const wire = new T.MeshStandardMaterial({ color: 0x15171a, roughness: .8, metalness: .1 }), wireRed = new T.MeshStandardMaterial({ color: 0x5a1f16, roughness: .8, metalness: .1 });
const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m };
const box = (p, w, h, d, m, x, y, z) => add(p, new T.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (p, rt, rb, h, m, x, y, z, rx, ry, rz) => add(p, new T.CylinderGeometry(rt, rb, h, 14), m, x, y, z, rx, ry, rz);
function tube(p, pts, r, m) { const t = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), 28, r, 6, false), m); t.castShadow = true; p.add(t); return t }

// ---- neon letters: hollow double-line tube outline, hot white-green core, wide green halo, transparent everywhere else ---------------------------------------------------------------
const FONT = '900 230px Impact,"Arial Black","Franklin Gothic Heavy",sans-serif', PAD = 40, CH = 330;
const meas = document.createElement('canvas').getContext('2d'); meas.font = FONT;
function glyph(ch) {
  const adv = Math.max(60, meas.measureText(ch).width), w = Math.ceil(adv + PAD * 2), c = document.createElement('canvas'); c.width = w; c.height = CH; const g = c.getContext('2d');
  g.font = FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = '#2fff6a'; for (const [blur, lw, a] of [[46, 14, .55], [26, 12, .7], [12, 10, .9]]) { g.globalAlpha = a; g.shadowColor = '#22ff5c'; g.shadowBlur = blur; g.lineWidth = lw; g.strokeText(ch, w / 2, CH / 2) }
  g.globalAlpha = 1; g.shadowBlur = 8; g.shadowColor = '#7dff9d'; g.strokeStyle = '#e4ffe9'; g.lineWidth = 3.4; g.strokeText(ch, w / 2, CH / 2);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return { tex: t, adv, w };
}
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(70,255,120,.55)'); gr.addColorStop(.5, 'rgba(40,200,90,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c) })();

const words = [], UNIT = .0033, WORD_W = 3.0;      // one scale for both words: glyph pixels -> local units (cap height about .55)
function neonWord(text, y) {
  const wg = new T.Group(); wg.position.y = y; G.add(wg);
  const parts = [...text].map(ch => ch === ' ' ? { gap: true, adv: 60 } : { ch, ...glyph(ch) }), total = parts.reduce((a, p) => a + (p.gap ? p.adv : p.adv * .84), 0), unit = UNIT;
  let x = -total * unit / 2; const letters = [];
  for (const p of parts) {
    if (p.gap) { x += p.adv * unit; continue }
    const planeH = CH * unit, planeW = p.w * unit, cx = x + p.adv * .42 * unit;
    const mat = new T.MeshBasicMaterial({ map: p.tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 1 });
    const m = new T.Mesh(new T.PlaneGeometry(planeW, planeH), mat); m.position.set(cx, 0, .06); m.renderOrder = 6; wg.add(m);
    letters.push({ mat, x: cx, v: 1, bad: false, burst: 0, burstEnd: 0, nextDrop: Math.random() * 4 });
    x += p.adv * .84 * unit;
  }
  // a faint halo behind each word, flickering with it
  const halo = new T.Mesh(new T.PlaneGeometry(total * unit * 1.5, .95), new T.MeshBasicMaterial({ map: glowTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: .8 })); halo.position.z = .02; halo.renderOrder = 5; wg.add(halo);
  // the physical sign: two thin rails and tube clips behind the letters hold them, no panel
  for (const sy of [-.16, .16]) box(wg, total * unit + .1, .018, .02, dark, 0, sy, -.01);
  for (const l of letters) { cyl(wg, .014, .014, .07, steel, l.x, .2, 0, PI / 2, 0, 0); cyl(wg, .014, .014, .07, steel, l.x, -.2, 0, PI / 2, 0, 0) }
  const light = new T.PointLight(0x39ff6a, 7, 8.5, 1.5); light.position.set(0, 0, .85); wg.add(light);
  const w = { text, wg, letters, halo, light, baseLight: 7, brown: 0, brownEnd: 0 }; words.push(w); return w;
}
const optionsWord = neonWord('OPTIONS', .305), exitWord = neonWord('EXIT GAME', -.305);
exitWord.letters[exitWord.letters.length - 3].bad = true;      // the dying tube in "GAME"... the 'A' sputters
optionsWord.letters[2].bad = true;                             // and the 'T' in OPTIONS

// ---- mounting hardware: pole clamps on the fence column, short bracket arms, conduit, junction box, wiring -------------------------------------------------------------------------------
const PX = -2.15;
for (const y of [.52, -.52]) {
  box(G, .45, .06, .06, steel, PX + .3, y, -.04); box(G, .22, .34, .05, rust, PX, y, -.13);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) cyl(G, .02, .02, .05, brass, PX + sx * .07, y + sy * .12, -.17, PI / 2, 0, 0);
  const ring = add(G, new T.TorusGeometry(.135, .02, 8, 18), dark, PX, y, -.12, PI / 2, 0, 0); ring.castShadow = false;
}
const conduit = (x, y0, y1, z) => { cyl(G, .035, .035, Math.abs(y1 - y0), steel, x, (y0 + y1) / 2, z, 0, 0, 0); for (let y = Math.min(y0, y1) + .3; y < Math.max(y0, y1); y += .75) { const r = add(G, new T.TorusGeometry(.05, .012, 6, 14), dark, x, y, z, PI / 2, 0, 0); r.castShadow = false; box(G, .12, .05, .05, rust, x, y, z - .05) } };
conduit(PX + .3, .6, 3.3, -.16); conduit(PX + .3, -.72, -1.9, -.16);
const jb = new T.Group(); jb.position.set(PX + .75, -.95, -.2); G.add(jb);
box(jb, .44, .56, .22, dark, 0, 0, 0); box(jb, .48, .06, .26, steel, 0, .31, 0); for (const sx of [-1, 1]) for (const sy of [-1, 1]) cyl(jb, .02, .02, .03, brass, sx * .18, sy * .22, .12, PI / 2, 0, 0);
const led = new T.Mesh(new T.SphereGeometry(.028, 10, 8), new T.MeshBasicMaterial({ color: 0xff3a2a })); led.position.set(-.12, .15, .125); jb.add(led);
cyl(jb, .035, .035, .35, steel, 0, .46, -.02, 0, 0, 0); cyl(jb, .035, .035, .4, steel, -.2, -.45, -.02, 0, 0, 0);
tube(G, [[PX + .75, -.8, -.2], [PX + 1.4, -1.2, -.05], [.2, -1.05, -.1], [1.2, -.4, -.05]], .014, wire);
tube(G, [[PX + .6, -.9, -.2], [PX + 1.0, -1.55, -.2], [-.5, -1.5, -.15], [-1.0, -.45, -.02]], .011, wireRed);
tube(G, [[PX + .3, 3.0, -.16], [PX - .1, 3.3, -.4], [PX + .1, 3.8, -.7], [PX + .9, 4.2, -.9]], .013, wire);
tube(G, [[1.45, .25, -.02], [1.65, -.05, -.05], [1.5, -.4, -.12], [1.3, -.75, -.14]], .01, wire);      // lead feeding the right-hand end of the tubes

// ---- behaviour -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const hover = {};
for (const [aria, key] of [['Options', 'OPTIONS'], ['Exit game', 'EXIT GAME']]) {
  const bind = () => { const b = document.querySelector(`#cinematic-controls button[aria-label="${aria}"]`); if (!b) return false; b.addEventListener('pointerenter', () => hover[key] = true); b.addEventListener('pointerleave', () => hover[key] = false); b.addEventListener('focus', () => hover[key] = true); b.addEventListener('blur', () => hover[key] = false); return true };
  if (!bind()) setTimeout(bind, 800);
}
let lastT = performance.now() / 1000;
function flicker(now, dt, reduced) {
  for (const w of words) {
    if (reduced) { for (const l of w.letters) l.v = 1; w.mean = 1; continue }
    if (now > w.brownEnd && Math.random() < .12 * dt) { w.brownEnd = now + .15 + Math.random() * .35 }          // rare brown-out of the whole word
    const brown = now < w.brownEnd ? .35 + .3 * Math.random() : 1;
    let sum = 0;
    for (const l of w.letters) {
      const hum = .94 + .06 * Math.sin(now * 100 + l.x * 7);
      if (now > l.burstEnd) { l.burst = 0; if (now > l.nextDrop) { l.burstEnd = now + (l.bad ? .15 + Math.random() * .4 : .08 + Math.random() * .18); l.burst = 1; l.nextDrop = now + (l.bad ? .7 + Math.random() * 2.2 : 6 + Math.random() * 18) } }
      const sputter = l.burst ? (Math.random() < .5 ? .08 : .9) : 1;
      const target = hum * sputter * brown; l.v += (target - l.v) * Math.min(1, dt * 40); sum += l.v;
    }
    w.mean = sum / w.letters.length;
  }
}
const orig = MM.update;
MM.update = function (dt, t) {
  const now = performance.now() / 1000, d = Math.min(.1, now - lastT); lastT = now;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || window.AshfallSettings?.state?.reduceMotion || window.AshfallSettings?.state?.flicker === 0;
  flicker(now, d, reduced);
  for (const w of words) {
    const boost = hover[w.text] ? 1.5 : 1;
    for (const l of w.letters) l.mat.opacity = Math.min(1, l.v * boost);
    w.halo.material.opacity = .8 * w.mean * boost;
    w.light.userData.menuBaseIntensity = w.baseLight * w.mean * w.mean * boost;     // the real light follows the tubes, so the flicker moves across the fence and floor
  }
  return orig.call(this, dt, t);
};
window.AshfallMenuWallSign = { group: G, words };
})();
