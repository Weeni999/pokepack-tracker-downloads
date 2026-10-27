/* MENU TITLE NEON: the COCKPIT sign gets the same look as the OPTIONS / EXIT GAME sign: hollow neon-tube letters with no panel behind them, per-letter flicker (one tired tube),
   and a real light that follows the glow. It stays the brightest thing in the room so the hierarchy holds. The chicken crest tubes are kept and flicker with it.
   The old frame, back panel and extruded letters are removed; the invisible click box (set.signHit) stays so clicking the sign still starts the game.
   Letters P, I and T are registered with AshfallMirrorHide so the wet-floor reflection still shows only "COCK". */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, CM = window.AshfallCinematicMenu, MM = window.AshfallMainMenu;
if (!hub || !T || !CM || !MM || typeof MM.update !== 'function') return;
const upper = hub.scene.getObjectByName('COCKPIT_SIGN');
if (!upper) return;
const PI = Math.PI;

// ---- strip the panel look; keep the click box (the 6.85 x 2 box, 8.56 x 2.5 once the group's 1.25 scale is applied), the crest tubes and any lights -------------------------------------------------------------------
const kids = [...upper.children], hit = kids.find(c => c.isMesh && c.geometry?.type === 'BoxGeometry' && (c.geometry.parameters.width > 6 && c.geometry.parameters.height > 1.8 && c.geometry.parameters.depth < .3));
for (const c of kids) {
  if (c === hit) { c.visible = false; continue }
  const isCrest = c.isMesh && c.geometry?.type === 'TubeGeometry';
  if (isCrest || c.isLight) continue;
  upper.remove(c); c.traverse(o => { o.geometry?.dispose?.(); for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) m.dispose?.() });
}
const crest = kids.filter(c => c.isMesh && c.geometry?.type === 'TubeGeometry'), crestMat = crest[0]?.material;

// ---- neon glyphs (same recipe as the wall sign) -----------------------------------------------------------------------------------------------------------------------------------------
const FONT = '900 230px Impact,"Arial Black","Franklin Gothic Heavy",sans-serif', PAD = 40, CH = 330, UNIT = .0102, SPACING = .84;
const meas = document.createElement('canvas').getContext('2d'); meas.font = FONT;
function glyph(ch) {
  const adv = Math.max(60, meas.measureText(ch).width), w = Math.ceil(adv + PAD * 2), c = document.createElement('canvas'); c.width = w; c.height = CH; const g = c.getContext('2d');
  g.font = FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = '#2fff6a'; for (const [blur, lw, a] of [[54, 16, .55], [30, 13, .7], [14, 11, .9]]) { g.globalAlpha = a; g.shadowColor = '#22ff5c'; g.shadowBlur = blur; g.lineWidth = lw; g.strokeText(ch, w / 2, CH / 2) }
  g.globalAlpha = 1; g.shadowBlur = 9; g.shadowColor = '#7dff9d'; g.strokeStyle = '#e8ffec'; g.lineWidth = 3.8; g.strokeText(ch, w / 2, CH / 2);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return { tex: t, adv, w };
}
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(70,255,120,.6)'); gr.addColorStop(.5, 'rgba(40,200,90,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c) })();

const wg = new T.Group(); wg.position.set(0, .2, 0); upper.add(wg);
const parts = [...'COCKPIT'].map(ch => ({ ch, ...glyph(ch) })), total = parts.reduce((a, p) => a + p.adv * SPACING, 0) * UNIT, letters = [];
let x = -total / 2;
parts.forEach((p, i) => {
  const planeH = CH * UNIT, planeW = p.w * UNIT, cx = x + p.adv * .42 * UNIT;
  const mat = new T.MeshBasicMaterial({ map: p.tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
  const m = new T.Mesh(new T.PlaneGeometry(planeW, planeH), mat); m.position.set(cx, 0, .06); m.renderOrder = 7; wg.add(m);
  if (i >= 4) (window.AshfallMirrorHide = window.AshfallMirrorHide || []).push(m);          // P I T are left out of the puddle reflection
  letters.push({ mat, x: cx, v: 1, bad: i === 2, burst: 0, burstEnd: 0, nextDrop: Math.random() * 6 });
  x += p.adv * SPACING * UNIT;
});
const halo = new T.Mesh(new T.PlaneGeometry(total * 1.4, 3.6), new T.MeshBasicMaterial({ map: glowTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: .85 })); halo.position.z = .02; halo.renderOrder = 6; wg.add(halo);
// the sign is held by thin rails and tube clips only
const dark = new T.MeshStandardMaterial({ color: 0x14181a, roughness: .7, metalness: .6 }), steel = new T.MeshStandardMaterial({ color: 0x3b444a, roughness: .55, metalness: .8 });
for (const sy of [-.5, .55]) { const r = new T.Mesh(new T.BoxGeometry(total + .3, .04, .04), dark); r.position.set(0, sy, -.02); wg.add(r) }
for (const l of letters) for (const sy of [-.5, .55]) { const c = new T.Mesh(new T.CylinderGeometry(.03, .03, .12, 10), steel); c.rotation.x = PI / 2; c.position.set(l.x, sy, 0); wg.add(c) }
const light = new T.PointLight(0x39ff6a, 40, 20, 1.5); light.position.set(0, .1, 2.4); wg.add(light);

// ---- behaviour ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let hovering = false, brownEnd = 0, lastT = performance.now() / 1000, mean = 1;
const bindHover = () => { const b = document.querySelector('#cinematic-controls button[aria-label^="Start game"]'); if (!b) return false; b.addEventListener('pointerenter', () => hovering = true); b.addEventListener('pointerleave', () => hovering = false); b.addEventListener('focus', () => hovering = true); b.addEventListener('blur', () => hovering = false); return true };
if (!bindHover()) setTimeout(bindHover, 800);
const baseCrest = crestMat?.emissiveIntensity ?? .75;
const orig = MM.update;
MM.update = function (dt, t) {
  const now = performance.now() / 1000, d = Math.min(.1, now - lastT); lastT = now;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || window.AshfallSettings?.state?.reduceMotion || window.AshfallSettings?.state?.flicker === 0;
  if (reduced) { for (const l of letters) l.v = 1; mean = 1 }
  else {
    if (now > brownEnd && Math.random() < .05 * d) brownEnd = now + .12 + Math.random() * .25;     // a rare, brief sag of the whole sign
    const brown = now < brownEnd ? .45 + .3 * Math.random() : 1; let sum = 0;
    for (const l of letters) {
      const hum = .95 + .05 * Math.sin(now * 100 + l.x * 5);
      if (now > l.burstEnd) { l.burst = 0; if (now > l.nextDrop) { l.burstEnd = now + (l.bad ? .12 + Math.random() * .3 : .06 + Math.random() * .12); l.burst = 1; l.nextDrop = now + (l.bad ? 1.8 + Math.random() * 4 : 14 + Math.random() * 30) } }
      const sputter = l.burst ? (Math.random() < .5 ? .15 : .9) : 1;
      l.v += (hum * sputter * brown - l.v) * Math.min(1, d * 40); sum += l.v;
    }
    mean = sum / letters.length;
  }
  const boost = hovering ? 1.25 : 1;
  for (const l of letters) l.mat.opacity = Math.min(1, l.v * boost);
  halo.material.opacity = .85 * mean * boost;
  light.userData.menuBaseIntensity = 40 * mean * mean * boost;
  if (crestMat) crestMat.emissiveIntensity = baseCrest * (.4 + .6 * mean);
  return orig.call(this, dt, t);
};
window.AshfallMenuTitleNeon = { group: wg, letters };
document.body.classList.remove('cinematic-boot');
})();
