/* WAREHOUSE SHELL: the yard becomes one cavernous industrial hangar. Tall dirty walls above the existing fences, a ceiling 28 m up with steel trusses, skylights with
   moonlight shafts, slowly turning extractor fans, an overhead crane that rolls along the roof, multi-storey scaffold galleries on both long walls, towering concrete
   pillars, hanging chains and cables, parked forklifts, crate stacks and junk piles. The old distant arena room is gone (lobby-config.js no longer has it); the fight ring
   (yard-dressing.js) stands in the middle of the floor. All of it lives in the yard group, so it streams and is pre-warmed with the yard. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu;
if (!hub || !T || !W?.yard || !MM || typeof MM.update !== 'function') return;
const yard = W.yard, PI = Math.PI, rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(29);
const S = new T.Group(); S.name = 'WAREHOUSE_SHELL'; yard.add(S);
const X0 = -23, X1 = 23, Z0 = -81, Z1 = -38, H = 28, CX = 0, CZ = -59.5;

const mats = {};
const M = (key, color, rough = .8, metal = .4, extra = {}) => mats[key] || (mats[key] = new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m };
const box = (p, w, h, d, mat, x, y, z, rx, ry, rz) => add(p, new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
const cyl = (p, rt, rb, h, mat, x, y, z, rx, ry, rz, seg = 8) => add(p, new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, rx, ry, rz);
const rod = (p, a, b, r, mat) => { const va = new T.Vector3(...a), vb = new T.Vector3(...b), len = va.distanceTo(vb), m = add(p, new T.CylinderGeometry(r, r, len, 6), mat); m.position.copy(va).lerp(vb, .5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); return m };
const steel = M('s', 0x3a423d, .55, .8), rust = M('r', 0x6a4028, .9, .4), dark = M('d', 0x101412, .8, .5), conc = M('c', 0x4d514d, .95, .1), yellow = M('y', 0xb08a20, .7, .4);

// ---- wall panels: corrugated, rust-streaked, soaked in shadow --------------------------------------------------------------------------------------------------------------------------------------------
function wallTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#3a3e39'; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 16) { g.fillStyle = x % 32 ? 'rgba(0,0,0,.32)' : 'rgba(255,255,255,.07)'; g.fillRect(x, 0, 8, 512) }
  for (let i = 0; i < 70; i++) { const x = rnd() * 512, w = 2 + rnd() * 14; const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, `rgba(110,62,32,${.35 + rnd() * .4})`); gr.addColorStop(1, 'rgba(110,62,32,0)'); g.fillStyle = gr; g.fillRect(x, rnd() * 100, w, 200 + rnd() * 312) }
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .35})`; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3) }
  for (let y = 120; y < 512; y += 170) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y, 512, 6) }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
const wt = wallTexture(), wallMat = (rx, ry) => { const t = wt.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new T.MeshStandardMaterial({ map: t, roughness: .9, metalness: .3, side: T.DoubleSide, color: 0xb0b0a8 }) };
const wallH = H - 6.5, wallY = 6.5 + wallH / 2;
add(S, new T.PlaneGeometry(Z1 - Z0, wallH), wallMat(10, 5), X0 - .05, wallY, CZ, 0, PI / 2, 0);
add(S, new T.PlaneGeometry(Z1 - Z0, wallH), wallMat(10, 5), X1 + .05, wallY, CZ, 0, -PI / 2, 0);
add(S, new T.PlaneGeometry(X1 - X0, wallH + 6.5), wallMat(10, 6), CX, (H + 0) / 2, Z0 - .05, 0, 0, 0);
add(S, new T.PlaneGeometry(X1 - X0, wallH), wallMat(10, 5), CX, wallY, Z1 + .05, 0, PI, 0);
// ceiling plane with skylights
add(S, new T.PlaneGeometry(X1 - X0 + 2, Z1 - Z0 + 2), new T.MeshStandardMaterial({ color: 0x0c0f0e, roughness: 1, side: T.DoubleSide }), CX, H, CZ, PI / 2, 0, 0);
const skyMat = new T.MeshBasicMaterial({ color: 0x7fa0c0, transparent: true, opacity: .55, toneMapped: false, side: T.DoubleSide }), beamMat = new T.MeshBasicMaterial({ color: 0x8fb0d0, transparent: true, opacity: .05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
const skylights = [];
for (const [x, z] of [[-14, -48], [0, -48], [14, -48], [-14, -70], [0, -70], [14, -70]]) {
  const sk = add(S, new T.PlaneGeometry(5, 8), skyMat, x, H - .05, z, PI / 2, 0, 0); skylights.push(sk);
  box(S, 5.4, .3, .3, dark, x, H - .2, z - 4.1); box(S, 5.4, .3, .3, dark, x, H - .2, z + 4.1); box(S, .3, .3, 8.4, dark, x - 2.7, H - .2, z); box(S, .3, .3, 8.4, dark, x + 2.7, H - .2, z);
  for (let k = -1; k <= 1; k++) box(S, .06, .06, 8, steel, x + k * 1.6, H - .12, z);
  const beam = add(S, new T.CylinderGeometry(2.8, 6.5, 19, 16, 1, true), beamMat, x, H - 9.8, z);
}

// ---- trusses, purlins, crane ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = -80; z <= -39; z += 6.8) {
  box(S, X1 - X0, .5, .5, steel, 0, H - 1.2, z); box(S, X1 - X0, .5, .5, steel, 0, H - 4.2, z);
  for (let x = X0; x < X1; x += 3.8) { rod(S, [x, H - 4.2, z], [x + 1.9, H - 1.2, z], .1, steel); rod(S, [x + 1.9, H - 1.2, z], [x + 3.8, H - 4.2, z], .1, steel) }
  for (let x = X0; x <= X1; x += 3.8) box(S, .2, 3, .2, steel, x, H - 2.7, z);
}
for (const x of [-18, -9, 0, 9, 18]) box(S, .35, .35, Z1 - Z0, steel, x, H - 1.2, CZ);
// overhead crane
const crane = new T.Group(); S.add(crane); crane.position.set(0, 0, -58);
box(crane, X1 - X0 - 1, 1.3, .9, yellow, 0, 21.6, 0); box(crane, X1 - X0 - 1, .25, 1.4, steel, 0, 22.3, 0);
for (const sx of [-1, 1]) { box(crane, 1.2, 1.2, 2.4, dark, sx * 22.2, 21.6, 0); for (const sz of [-1, 1]) cyl(crane, .35, .35, .4, steel, sx * 22.2, 21.1, sz * 1, PI / 2, 0, 0, 12) }
const trolley = new T.Group(); trolley.position.set(-6, 21.6, 0); crane.add(trolley);
box(trolley, 2.2, .9, 1.4, dark, 0, -.5, 0); const hookChain = cyl(trolley, .06, .06, 9, steel, 0, -5.4, 0, 0, 0, 0, 6); box(trolley, .6, .8, .5, yellow, 0, -10.1, 0);
for (const sx of [-1, 1]) { box(S, 1, 1.2, Z1 - Z0 + 2, steel, sx * 22.4, 21, CZ) }
// ---- extractor fans on the high end walls ------------------------------------------------------------------------------------------------------------------------------------------------------------------
const fans = [];
for (const [x, y, z, ry] of [[-12, 22, Z0 + .3, 0], [12, 22, Z0 + .3, 0], [-12, 22, Z1 - .3, PI], [12, 22, Z1 - .3, PI]]) {
  const f = new T.Group(); f.position.set(x, y, z); f.rotation.y = ry; S.add(f);
  add(f, new T.TorusGeometry(2.4, .22, 8, 28), steel); const rotor = new T.Group(); f.add(rotor);
  for (let i = 0; i < 5; i++) { const b = box(rotor, .5, 2.1, .06, dark, 0, 1.2, 0); b.rotation.z = 0; b.parent.remove(b); const bl = new T.Group(); bl.rotation.z = i / 5 * PI * 2; bl.add(b); rotor.add(bl) }
  cyl(rotor, .35, .35, .4, steel, 0, 0, 0, PI / 2, 0, 0, 12); fans.push(rotor);
}
// ---- pillars, brackets, ducts, pipes --------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const x of [-20.2, 20.2]) for (const z of [-46, -59.5, -73]) {
  box(S, 2.2, H, 2.2, conc, x, H / 2, z); box(S, 2.6, .5, 2.6, steel, x, 5, z); box(S, 2.6, .5, 2.6, steel, x, 14, z); box(S, 2.6, .5, 2.6, rust, x, .25, z);
  for (let y = 2; y < H; y += 5) box(S, 2.3, .16, 2.3, dark, x, y, z);
}
for (const [y, r] of [[19, .6], [17.2, .4], [15.7, .3]]) cyl(S, r, r, Z1 - Z0, rust, -16 + (y - 15) * .8, y, CZ, PI / 2, 0, 0, 12);
for (const x of [-8, 8]) box(S, 2.2, 1.6, Z1 - Z0 - 4, M('duct', 0x555a52, .6, .7), x, 24.8, CZ);

// ---- scaffold galleries (multi-storey) with railings; spectators are placed on them by yard-dressing.js ---------------------------------------------------------------------------------------------
const galleries = [];
function gallery(side, y, z0, z1) {
  const x = side * 20.4, g = new T.Group(); g.position.set(x, y, (z0 + z1) / 2); S.add(g); const L = Math.abs(z1 - z0);
  box(g, 4.2, .16, L, M('plat', 0x3a3d38, .8, .6), 0, 0, 0); box(g, .06, .06, L, steel, -side * 2.1, 1.0, 0); box(g, .06, .06, L, steel, -side * 2.1, .5, 0);
  for (let z = -L / 2; z <= L / 2; z += 1.8) cyl(g, .03, .03, 1, steel, -side * 2.1, .5, z, 0, 0, 0, 6);
  for (let z = -L / 2; z <= L / 2; z += 6) { cyl(g, .1, .1, y, steel, -side * 2, -y / 2, z, 0, 0, 0, 8); if (z < L / 2) rod(g, [-side * 2, -y, z], [-side * 2, -y * .4, z + 6], .04, steel) }
  galleries.push({ side, y, z0, z1, x }); return g;
}
for (const y of [9.4, 13.6, 17.8]) { gallery(-1, y, -78, -42); gallery(1, y, -78, -42) }
for (const side of [-1, 1]) for (const z of [-50, -70]) { const x = side * 22.2; for (let y = 1; y < 17.8; y += .5) box(S, .6, .05, .05, steel, x, y, z) }

// ---- chains and cables from the roof ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let i = 0; i < 70; i++) { const x = X0 + 2 + rnd() * 42, z = Z0 + 2 + rnd() * 36, len = 4 + rnd() * 12; if (Math.abs(x) < 5 && Math.abs(z - -62) < 5) continue; cyl(S, .025 + rnd() * .03, .025 + rnd() * .03, len, i % 3 ? steel : dark, x, H - 1.4 - len / 2, z, 0, 0, 0, 5); if (i % 4 === 0) box(S, .4, .5, .4, rust, x, H - 1.4 - len, z) }

// ---- vehicles, crates, junk piles -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function forklift(x, z, ry) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  box(g, 1.6, 1.0, 2.6, yellow, 0, .9, 0); box(g, 1.5, .3, 1.3, dark, 0, 1.55, -.5); for (const sx of [-1, 1]) { box(g, .08, 2.2, .08, dark, sx * .7, 1.9, -.4); box(g, .1, .1, 1.5, steel, sx * .6, .5, 1.9); cyl(g, .4, .4, .3, dark, sx * .8, .4, .8, 0, 0, PI / 2, 14); cyl(g, .35, .35, .3, dark, sx * .8, .35, -.9, 0, 0, PI / 2, 14) }
  box(g, 1.7, .08, .1, dark, 0, 2.9, -.4); box(g, .6, .8, 1.2, rust, 0, 1.5, 2.1);
}
forklift(-14, -78, .4); forklift(15, -43, PI - .5); forklift(17.5, -78, -.9);
for (const [x, z] of [[-17, -43], [16, -77], [-17.8, -79], [8, -79.5], [-8, -80]]) { const n = 3 + Math.floor(rnd() * 4); for (let i = 0; i < n; i++) box(S, 1.4, 1.1, 1.4, i % 2 ? rust : M('crate', 0x4a3c28, .9, .2), x + (rnd() - .5) * 2.2, .55 + Math.floor(i / 2) * 1.1, z + (rnd() - .5) * 2, 0, rnd() * 1.5, 0) }
for (const [x, z] of [[-19, -78], [19, -48], [-4, -79], [10, -79]]) for (let i = 0; i < 18; i++) { const k = rnd(); box(S, .3 + k * 1.2, .2 + k * .8, .3 + k * 1.1, [rust, steel, dark][i % 3], x + (rnd() - .5) * 3.6, .15 + rnd() * .8, z + (rnd() - .5) * 2.4, rnd(), rnd() * 3, rnd()) }

// ---- animation ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let last = performance.now() / 1000, t = 0;
function step() {
  const now = performance.now() / 1000, dt = Math.min(.1, now - last); last = now; t += dt;
  for (const f of fans) f.rotation.z += dt * 1.1;
  crane.position.z = -59.5 + Math.sin(t * .05) * 14; trolley.position.x = Math.sin(t * .09) * 14;
  for (const s of skylights) s.material.opacity = .55 + Math.sin(t * .3 + s.position.x) * .03;
}
const orig = MM.update;
MM.update = function (dt, tt) { if (W.root.visible && yard.visible) { try { step() } catch (e) { if (!step.w) { step.w = true; console.warn('[warehouse-shell]', e) } } } return orig.call(this, dt, tt) };
window.AshfallWarehouse = { group: S, galleries, H };
})();
