/* BACK WALL NEON: the huge green neon rooster head (art/rooster-neon.webp) on the back wall of the warehouse, behind the fight ring.
   The photo's dark brick background is keyed out so only the glowing tubes remain; they are drawn additively so they glow against the real wall and are hidden by the
   crowd and ring in front. A soft green halo sits behind it and the whole sign hums and sags like tired neon. It uses no light, so the scene's light count is unchanged. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu;
if (!hub || !T || !W?.yard || !MM || typeof MM.update !== 'function') return;
const yard = W.yard, group = new T.Group(); group.name = 'BACK_WALL_NEON'; group.userData.ignorePsx = true; group.position.set(6, 15.5, -80.4); yard.add(group);
const SRC = { x: 318, y: 12, w: 396, h: 548 };                                         // the rooster head inside the 1024 x 572 photo
const HEIGHT = 17, WIDTH = HEIGHT * SRC.w / SRC.h;
const api = window.AshfallBackWallNeon = { group, cfg: { brightness: 1, halo: 1 } };
let mat = null, halo = null, t0 = performance.now() / 1000, dipUntil = 0;

const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(60,255,110,.5)'); gr.addColorStop(.55, 'rgba(30,200,80,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c) })();
halo = new T.Mesh(new T.PlaneGeometry(WIDTH * 1.9, HEIGHT * 1.35), new T.MeshBasicMaterial({ map: glowTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: .85 }));
halo.position.z = -.05; halo.renderOrder = 2; group.add(halo);

const img = new Image();
img.onload = () => {
  const c = document.createElement('canvas'); c.width = SRC.w; c.height = SRC.h; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, SRC.x, SRC.y, SRC.w, SRC.h, 0, 0, SRC.w, SRC.h);
  const d = g.getImageData(0, 0, SRC.w, SRC.h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {                                               // key out the bricks: keep only what actually glows
    const v = Math.max(p[i], p[i + 1], p[i + 2]), a = Math.min(1, Math.max(0, (v - 85) / 120)), k = a * a * (3 - 2 * a);
    const y = (i / 4 / SRC.w) / SRC.h, red = Math.max(Math.min(1, Math.max(0, (.27 - y) / .04)), Math.min(1, Math.max(0, (y - .6) / .32)) ** 1.3);                // ombre: the comb at the top and the neck feathers at the bottom fade from green into red, like the eye
    const r0 = p[i], g0 = p[i + 1], b0 = p[i + 2]; p[i] = (r0 + (g0 - r0) * red) * k; p[i + 1] = (g0 + (r0 * .5 - g0) * red) * k; p[i + 2] = (b0 + (b0 * .5 - b0) * red) * k; p[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  mat = new T.MeshBasicMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 1 });
  const sign = new T.Mesh(new T.PlaneGeometry(WIDTH, HEIGHT), mat); sign.renderOrder = 3; group.add(sign);
  // a few mounting rails and a transformer box so it reads as a real fixture, not a projection
  const dark = new T.MeshStandardMaterial({ color: 0x14181a, roughness: .7, metalness: .6 });
  for (const sy of [-.38, .38]) { const r = new T.Mesh(new T.BoxGeometry(WIDTH * .95, .12, .12), dark); r.position.set(0, sy * HEIGHT, -.1); group.add(r) }
  const box = new T.Mesh(new T.BoxGeometry(1.2, .8, .5), dark); box.position.set(WIDTH * .15, -HEIGHT * .47, -.15); group.add(box);
};
img.onerror = () => console.warn('[back-wall-neon] art/rooster-neon.webp failed to load');
img.src = 'art/rooster-neon.webp';

const orig = MM.update;
MM.update = function (dt, t) {
  if (mat && W.root.visible && yard.visible) {
    const now = performance.now() / 1000, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || window.AshfallSettings?.state?.reduceMotion || window.AshfallSettings?.state?.flicker === 0;
    if (!reduced && now > dipUntil && Math.random() < .006) dipUntil = now + .06 + Math.random() * .14;
    const hum = reduced ? 1 : .95 + .05 * Math.sin(now * 100), v = (now < dipUntil ? .4 + .3 * Math.random() : 1) * hum;
    const boost = window.AshfallRaveShow?.neonBoost ?? 1; mat.opacity = Math.min(1, v * (.3 + .7 * Math.min(1, boost)) * api.cfg.brightness); halo.material.opacity = .85 * v * boost * api.cfg.halo;
  }
  return orig.call(this, dt, t);
};
})();
