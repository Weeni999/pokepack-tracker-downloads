/* RAVE STAGE: a full club stage at the back of the warehouse. A raised platform with a DJ booth (decks, mixer, laptop, a robo-rooster DJ who nods on the kick and throws his arms up on drops),
   a giant LED wall with a glitching COCKPIT logo and a live spectrum (plus two angled side screens), stacks of sub-woofers whose cones pump with the kick, hanging line-array speakers,
   a lighting gantry with moving-head beams, floor up-lights, crowd barriers and an LED-trimmed stage lip. Everything listens to the rave show (AshfallRaveShow): beams answer to their own frequency
   band, the screens draw the band levels, the woofers follow the kick, and it all goes dark in the blackouts. No scene lights are added. Controls: dev menu (9) > STAGE. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu;
if (!hub || !T || !W?.yard || !MM || typeof MM.update !== 'function') return;
const yard = W.yard, PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const cfg = { enabled: true, screens: true, screenBright: 1, beams: true, beamBright: 1, dj: true, woofers: true, text: 'COCKPIT' };
const S = new T.Group(); S.name = 'RAVE_STAGE'; yard.add(S);
const PZ0 = -80.6, PZ1 = -72.6, PY = 1.25, PCZ = (PZ0 + PZ1) / 2;                 // platform: z from the back wall to the front lip, 1.25 m high

const M = (c, r = .6, m = .7, extra = {}) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra });
const dark = M(0x14181a, .6, .7), steel = M(0x3b4348, .5, .8), plate = M(0x1d2224, .45, .85), black = M(0x0a0c0d, .8, .3), skin = M(0x3a2a22, .7, .2);
const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m };
const box = (p, w, h, d, mat, x, y, z, rx, ry, rz) => add(p, new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
const cyl = (p, rt, rb, h, mat, x, y, z, rx, ry, rz, seg = 10) => add(p, new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, rx, ry, rz);
const glowMat = (c, o = 1) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
const R = () => window.AshfallRaveShow;
const bsOf = () => R()?.beatState, colorsOf = () => R()?.analysis?.colors;
const colAt = k => { const c = colorsOf(); if (!c?.length) return new T.Color(0x39ff6a); const n = c.length, f = ((k % n) + n) % n, i = Math.floor(f); return c[i].clone().lerp(c[(i + 1) % n], f - i) };

// ---- platform, lip, barriers ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(S, 26, PY, PZ1 - PZ0, plate, 0, PY / 2, PCZ);
const lipMat = glowMat(0x39ff6a, .9), lip = [box(S, 26.2, .1, .1, lipMat, 0, PY - .15, PZ1 + .05), box(S, .1, .1, PZ1 - PZ0, lipMat, -13.05, PY - .15, PCZ), box(S, .1, .1, PZ1 - PZ0, lipMat, 13.05, PY - .15, PCZ)];
const deckStrip = box(S, 26, .02, .12, glowMat(0xffffff, .5), 0, PY + .01, PZ1 - .2);
for (let x = -12; x <= 12; x += 2) box(S, .06, PY, .06, steel, x, PY / 2, PZ1 + .08);
const wash = add(S, new T.PlaneGeometry(24, 7), glowMat(0x39ff6a, 0), 0, PY + .03, PCZ, -PI / 2); wash.renderOrder = 3;           // coloured light on the stage floor
// crowd barrier in front of the stage
for (let x = -12; x <= 12; x += 2.4) { box(S, 2.3, .06, .06, steel, x, 1.1, -70.6); box(S, 2.3, .06, .06, steel, x, .55, -70.6); box(S, .08, 1.15, .1, steel, x - 1.15, .57, -70.6) }
for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) box(S, .9, .3, .5, black, sx * (14.2 + k * 1.1), .15, -73.3 - k * .6);   // road cases beside the stage

// ---- gantry: two towers and a top beam with the stage lights ------------------------------------------------------------------------------------------------------------------------------------------------------
const TOP = 11.6, GZ = -73.6;
const rungGeo = new T.BoxGeometry(.05, .05, .6), rungs = new T.InstancedMesh(rungGeo, steel, 80); let ri = 0; const tmp = new T.Object3D();
function trussH(x0, x1, y, z) { for (const dy of [-.28, .28]) for (const dz of [-.28, .28]) box(S, Math.abs(x1 - x0), .07, .07, steel, (x0 + x1) / 2, y + dy, z + dz); for (let x = x0; x <= x1; x += .9) { tmp.position.set(x, y, z); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 10, 1); tmp.updateMatrix(); rungs.setMatrixAt(ri++, tmp.matrix) } }
trussH(-13, 13, TOP, GZ);
for (const sx of [-1, 1]) { const x = sx * 13; for (const dx of [-.28, .28]) for (const dz of [-.28, .28]) box(S, .07, TOP, .07, steel, x + dx, TOP / 2, GZ + dz); for (let y = .8; y < TOP; y += .9) { tmp.position.set(x, y, GZ); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1, 1); tmp.updateMatrix(); rungs.setMatrixAt(ri++, tmp.matrix) } box(S, 1.2, .1, 1.2, steel, x, .05, GZ) }
rungs.count = ri; S.add(rungs);
// a rear beam above the LED wall for the wash lights
trussH(-13, 13, 9.4, -79.4);

// ---- LED screens (canvas textures redrawn live) -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function screen(w, h, cw, ch, x, y, z, ry) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'), tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false }), mesh = add(S, new T.PlaneGeometry(w, h), mat, x, y, z, 0, ry, 0);
  const frame = box(S, w + .5, h + .5, .3, dark, x, y, z - .18, 0, ry, 0); return { c, g, tex, mat, mesh, frame, w: cw, h: ch };
}
const big = screen(16, 5.4, 1024, 346, 0, 5.4, -80.4, 0), sideL = screen(3.4, 7.2, 256, 540, -11.4, 5.8, -79.4, .38), sideR = screen(3.4, 7.2, 256, 540, 11.4, 5.8, -79.4, -.38);
for (const sc of [big, sideL, sideR]) { sc.mesh.renderOrder = 2; sc.mesh.userData.ignorePsx = true }

// ---- DJ booth -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const BZ = -76.4, TY = PY + 1.0;
box(S, 6, 1.0, 1.3, dark, 0, PY + .5, BZ); box(S, 6.2, .08, 1.5, steel, 0, TY + .04, BZ);
const frontCanvas = document.createElement('canvas'); frontCanvas.width = 256; frontCanvas.height = 40; const frontTex = new T.CanvasTexture(frontCanvas); frontTex.colorSpace = T.SRGBColorSpace;
const frontMat = new T.MeshBasicMaterial({ map: frontTex, toneMapped: false }); add(S, new T.PlaneGeometry(5.6, .8), frontMat, 0, PY + .5, BZ + .66);
const platters = [];
for (const sx of [-1.6, 1.6]) { box(S, 1.1, .1, 1.05, black, sx, TY + .13, BZ); const p = cyl(S, .42, .42, .04, M(0x222628, .3, .9), sx, TY + .2, BZ, 0, 0, 0, 24); const dot = box(p, .06, .05, .3, glowMat(0xff3a2a, .95), 0, .03, .22); platters.push(p); const ring = add(S, new T.RingGeometry(.42, .46, 28), glowMat(0x39ff6a, .9), sx, TY + .225, BZ, -PI / 2); ring.userData.platter = true; platters.push(ring) }
box(S, .9, .1, .7, black, 0, TY + .13, BZ); for (let i = 0; i < 6; i++) box(S, .04, .05, .3, glowMat(0xffffff, .8), -.3 + i * .12, TY + .2, BZ);
const lap = box(S, .62, .03, .42, black, -2.5, TY + .12, BZ + .2), lapScreen = add(S, new T.PlaneGeometry(.58, .36), glowMat(0x39ff6a, .9), -2.5, TY + .32, BZ + .0, -.35); lapScreen.rotation.x = -.15; lapScreen.position.z = BZ + .02;
for (const sx of [-1, 1]) { box(S, .6, .5, .5, black, sx * 2.8, TY + .27, BZ - .1, 0, -sx * .3); const w = box(S, .5, .35, .55, dark, sx * 4.1, PY + .18, -75.4, -.4) }

// the DJ: a robo-rooster behind the decks
const dj = new T.Group(); dj.position.set(0, PY, BZ - .95); S.add(dj);
const body = add(dj, new T.CapsuleGeometry(.36, .7, 6, 12), M(0x2a2f33, .6, .6), 0, 1.15, 0), vest = box(dj, .78, .5, .46, M(0x7a1810, .6, .4), 0, 1.25, .02);
const head = new T.Group(); head.position.set(0, 1.95, 0); dj.add(head);
add(head, new T.SphereGeometry(.3, 14, 12), M(0x8a8f92, .5, .8), 0, 0, 0); add(head, new T.ConeGeometry(.12, .3, 8), M(0xe0a020, .5, .3), 0, -.03, .34, PI / 2);
for (const sx of [-1, 1]) { add(head, new T.SphereGeometry(.06, 8, 8), glowMat(0xff3a2a, 1), sx * .14, .06, .26) }
for (let i = 0; i < 3; i++) box(head, .1, .2 + (i === 1 ? .1 : 0), .1, M(0xd02a1a, .6, .2), -.12 + i * .12, .38, .02);
const hp = add(head, new T.TorusGeometry(.34, .04, 8, 20, PI), M(0x111111, .4, .5), 0, .02, 0, 0, 0, 0); hp.rotation.y = PI / 2; hp.rotation.z = 0;
for (const sx of [-1, 1]) add(head, new T.CylinderGeometry(.11, .11, .1, 12), M(0x111111, .4, .5), sx * .34, .02, 0, 0, 0, PI / 2);
const arms = [-1, 1].map(sx => { const sh = new T.Group(); sh.position.set(sx * .5, 1.55, .05); dj.add(sh); add(sh, new T.CapsuleGeometry(.1, .5, 4, 8), M(0x2a2f33, .6, .6), 0, -.3, 0); const el = new T.Group(); el.position.y = -.62; sh.add(el); add(el, new T.CapsuleGeometry(.09, .48, 4, 8), M(0x2a2f33, .6, .6), 0, -.28, 0); add(el, new T.SphereGeometry(.1, 8, 8), M(0xc8c8c8, .5, .5), 0, -.58, 0); return { sh, el, sx } });
for (const sx of [-1, 1]) { box(dj, .24, .8, .24, M(0x1a1d20, .6, .5), sx * .2, .4, 0) }

// ---- speakers: line arrays hanging off the gantry, sub-woofer stacks on the stage --------------------------------------------------------------------------------------------------------------
const woofers = [];
for (const sx of [-1, 1]) {
  for (let i = 0; i < 8; i++) { const b = box(S, 1.5, .85, 1.1, black, sx * 14.4, TOP - .7 - i * .88, -74.2, i * .035, 0, 0); for (const dx of [-.4, .4]) { cyl(b, .27, .27, .04, M(0x23282b, .5, .6), dx, 0, .56, PI / 2, 0, 0, 16); } }
  box(S, .06, .8, .06, steel, sx * 14.1, TOP + .1, -74.2); box(S, .06, .8, .06, steel, sx * 14.7, TOP + .1, -74.2);
  for (let col = 0; col < 2; col++) for (let row = 0; row < 3; row++) {
    const x = sx * (9.4 + col * 1.75), y = PY + .65 + row * 1.3, b = box(S, 1.65, 1.25, 1.4, black, x, y, -74.4);
    const w = new T.Group(); w.position.set(0, 0, .7); b.add(w); add(w, new T.CircleGeometry(.52, 24), M(0x15191b, .5, .5)); add(w, new T.RingGeometry(.4, .5, 24), M(0x3a4044, .4, .8), 0, 0, .01); const cone = add(w, new T.CircleGeometry(.3, 20), M(0x050607, .7, .2), 0, 0, .03); woofers.push({ w, cone, base: 0 });
  }
}
for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) box(S, 1.5, 1.5 + i * .15, 1.2, black, sx * (11.5 + i * 1.6), PY + .8, -79.4);   // amp walls at the back

// ---- stage lights: gantry moving heads (each answers to ONE frequency band) + floor up-lights (bass) --------------------------------------------------------------------------------------------------
const BEAM_LEN = 34, beamGeo = new T.ConeGeometry(1.1, BEAM_LEN, 12, 1, true); beamGeo.translate(0, -BEAM_LEN / 2, 0);
const DOWN = new T.Vector3(0, -1, 0), dv = new T.Vector3(), lights = [];
function mkLight(x, y, z, band, up) {
  const g = new T.Group(); g.position.set(x, y, z); S.add(g); add(g, new T.CylinderGeometry(.18, .26, .45, 10), dark, 0, up ? .1 : -.2, 0);
  const node = new T.Group(); g.add(node); const lens = add(node, new T.CircleGeometry(.17, 12), glowMat(0xffffff, .9), 0, -.45, 0, PI / 2), beam = add(node, beamGeo, glowMat(0xffffff, .12)); beam.renderOrder = 4;
  const L = { g, node, lens, beam, band, up, p: 0, q: new T.Quaternion(), n: 0, seen: 0, o: new T.Vector3(x, y, z), i: lights.length }; lights.push(L); aimAt(L, (Math.random() - .5) * 30, 1, -52 + Math.random() * 14); node.quaternion.copy(L.q); return L;
}
function aimAt(L, tx, ty, tz) { dv.set(tx - L.o.x, ty - L.o.y, tz - L.o.z).normalize(); L.q.setFromUnitVectors(DOWN, dv) }
for (let i = 0; i < 8; i++) mkLight(-10.5 + i * 3, TOP - .35, GZ + .3, 3 + (i % 5), false);
for (let i = 0; i < 6; i++) { const L = mkLight(-11 + i * 4.4, PY + .25, PZ1 - .6, i % 3, true); L.node.rotation.x = PI; L.beam.geometry; L.o.y = PY + .3; aimAt(L, (Math.random() - .5) * 20, 14, -66) ; L.node.quaternion.setFromUnitVectors(DOWN, dv.set(0, 1, 0)); L.q.setFromUnitVectors(DOWN, dv.set((Math.random() - .5) * .8, 1, .6).normalize()); L.node.quaternion.copy(L.q) }
// wall wash lights behind the LED screen
const rearWash = add(S, new T.PlaneGeometry(26, 9), glowMat(0x39ff6a, 0), 0, 5.5, -80.2); rearWash.renderOrder = 1;

// ---- screens: draw ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const bars = new Float32Array(56); let lastDraw = 0, glitchUntil = 0, sliceY = 0;
function levels() { const r = R(); if (!r?.band) return null; return r.band }
function drawBig(now, g, bs, bands, c0, c1) {
  const ctx = big.g, w = big.w, h = big.h;
  const grd = ctx.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#05030a'); grd.addColorStop(1, `#${c0.clone().multiplyScalar(.22).getHexString()}`); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  const n = bars.length, bw = w / n;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1) * (bands.length - 1), a = Math.floor(f), b = Math.min(bands.length - 1, a + 1), t = f - a; let v = lerp(bands[a].r * .7 + bands[a].pulse * .5, bands[b].r * .7 + bands[b].pulse * .5, t);
    v = clamp(v * (.8 + .25 * Math.sin(now * 7 + i * 1.7)), 0, 1.15); bars[i] = Math.max(v, bars[i] - .04) * (v > bars[i] ? 1 : 1);
    const hh = bars[i] * h * .78, col = c0.clone().lerp(c1, i / n);
    ctx.fillStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`; ctx.fillRect(i * bw + 2, h - hh, bw - 4, hh); ctx.fillStyle = '#fff'; ctx.fillRect(i * bw + 2, h - hh - 5, bw - 4, 3);
  }
  // logo with a chromatic glitch on every kick
  const p = bs.pulse, off = 3 + p * 14, txt = cfg.text; ctx.font = `900 ${txt.length > 8 ? 150 : 190}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,120,.75)'; ctx.fillText(txt, w / 2 - off, h * .46); ctx.fillStyle = 'rgba(40,220,255,.75)'; ctx.fillText(txt, w / 2 + off, h * .46); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillText(txt, w / 2, h * .46); ctx.globalCompositeOperation = 'source-over';
  if (now < glitchUntil) { for (let k = 0; k < 4; k++) { const y = Math.random() * h, sh = 8 + Math.random() * 30; try { ctx.drawImage(big.c, 0, y, w, sh, (Math.random() - .5) * 90, y, w, sh) } catch {} } }
  ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '700 20px monospace'; ctx.textAlign = 'left'; ctx.fillText(`${R()?.stats?.bpm || 0} BPM  ${R()?.stats?.section || ''}`, 16, 24);
}
function drawSides(now, g, bs, bands, c0, c1) {
  for (const [sc, mode] of [[sideL, 0], [sideR, 1]]) {
    const ctx = sc.g, w = sc.w, h = sc.h; ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, w, h);
    if (mode === 0) { const n = 16, bh = h / n; for (let i = 0; i < n; i++) { const b = bands[Math.min(bands.length - 1, Math.floor(i / n * bands.length))], v = clamp(b.r * .8 + b.pulse * .6, 0, 1), col = c0.clone().lerp(c1, i / n); ctx.fillStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`; ctx.fillRect(10, h - (i + 1) * bh + 3, (w - 20) * v, bh - 6) } }
    else { const cx = w / 2, cy = h / 2; for (let i = 0; i < 8; i++) { const b = bands[i], v = clamp(b.r * .7 + b.pulse * .7, 0, 1.2), col = c0.clone().lerp(c1, i / 8); ctx.strokeStyle = `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, 20 + i * 14 + v * 14, now * (i % 2 ? 1 : -1) * .6 + i, now * (i % 2 ? 1 : -1) * .6 + i + 1.2 + v * 3.2); ctx.stroke() } ctx.fillStyle = '#fff'; ctx.globalAlpha = .5 + bs.pulse * .5; ctx.beginPath(); ctx.arc(cx, cy, 14 + bs.pulse * 22, 0, 7); ctx.fill(); ctx.globalAlpha = 1 }
    ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  }
}
function drawFront(now, bs, c0) { const ctx = frontCanvas.getContext('2d'), w = 256, h = 40; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { const v = .35 + .65 * Math.abs(Math.sin(now * 3 + i * .6)) * (.4 + bs.pulse * .6); ctx.fillStyle = `hsl(${(now * 60 + i * 9) % 360},100%,${30 + v * 40}%)`; ctx.fillRect(i * 8 + 1, h - v * h, 6, v * h) } frontTex.needsUpdate = true }

// ---- per frame ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let last = performance.now() / 1000, tcol = new T.Color(), prevPulse = 0;
function tick() {
  const now = performance.now() / 1000, dt = Math.min(.1, now - last); last = now; const r = R(), bs = bsOf(), live = !!r?.playing && r.cfg.enabled && cfg.enabled, g = live && bs ? bs.gate : 0, bands = levels();
  S.visible = cfg.enabled;
  const c0 = colAt(0), c1 = colAt(2.4), pulse = live && bs ? bs.pulse : 0, drop = live && bs ? (bs.dropFlash || 0) : 0;
  if (bs && pulse > .95 && prevPulse <= .95 && Math.random() < .35) glitchUntil = now + .12; prevPulse = pulse;
  // screens: redraw at ~24 fps; they dim to a faint glow in a blackout
  if (cfg.screens && live && bands && bs && now - lastDraw > .042) { lastDraw = now; drawBig(now, g, bs, bands, c0, c1); drawSides(now, g, bs, bands, c0, c1); big.tex.needsUpdate = sideL.tex.needsUpdate = sideR.tex.needsUpdate = true; drawFront(now, bs, c0) }
  const sb = cfg.screens ? cfg.screenBright * (.12 + .88 * g) : 0; for (const sc of [big, sideL, sideR]) { sc.mat.color.setScalar(clamp(sb, 0, 1.5)); sc.mesh.visible = cfg.screens }
  frontMat.color.setScalar(.15 + .85 * g);
  // stage trim and floor wash take the show's colours and punch on the kick
  tcol.copy(c0); lipMat.color.copy(tcol); lipMat.opacity = .15 + .85 * g * (.5 + .5 * pulse); wash.material.color.copy(c1); wash.material.opacity = g * (.05 + .25 * pulse + drop * .3); rearWash.material.color.copy(c0); rearWash.material.opacity = g * (.04 + .22 * pulse + drop * .3); deckStrip.material.opacity = .15 + .5 * g;
  // lights: one band each; a hit on that band flashes the beam and sends it to a new part of the crowd
  for (const L of lights) {
    L.beam.visible = L.lens.visible = cfg.beams && live; if (!L.beam.visible) continue;
    const B = r.band?.[L.band]; if (B && B.hits !== L.seen) { L.seen = B.hits; L.p = 1; L.n++; aimAt(L, (Math.random() - .5) * 34, Math.random() * 2, -72 + Math.random() * 38); if (L.up) { dv.set((Math.random() - .5) * 1.4, 1, (Math.random() - .1) * 1.6).normalize(); L.q.setFromUnitVectors(DOWN, dv) } }
    L.p *= Math.exp(-dt * 7); L.node.quaternion.slerp(L.q, 1 - Math.exp(-dt * 14));
    const power = g * (.02 + .98 * Math.min(1, L.p + drop * .5)), col = colAt(L.i * .6 + 1 + (L.band || 0) * .4);
    L.lens.material.color.copy(col); L.beam.material.color.copy(col); L.lens.material.opacity = clamp(power, 0, 1); L.beam.material.opacity = clamp(power * .22 * cfg.beamBright, 0, .45);
  }
  // woofers pump on the kick; the platters spin with the tempo
  for (const w of woofers) { const k = cfg.woofers ? pulse : 0; w.cone.position.z = .03 + k * .09; w.cone.scale.setScalar(1 + k * .12) }
  const spin = (live ? (60 / (r.grid?.period ? 1 : 1)) : 0) * 0; const bpm = r?.stats?.bpm || 120; for (const p of platters) if (!p.userData.platter) p.rotation.y += dt * (live ? bpm / 60 * 1.9 : 0);
  // the DJ: nods on the kick, hands work the decks, both arms up on a drop
  if (cfg.dj) {
    const nod = pulse, up = clamp(drop * 2, 0, 1), t = now;
    head.rotation.x = .08 + nod * .28 - up * .3; head.rotation.y = Math.sin(t * 1.3) * .25; dj.position.y = PY + nod * .05 + Math.abs(Math.sin(t * bpm / 60 * PI)) * .02 * (live ? 1 : 0);
    arms.forEach(a => { const work = a.sx < 0 ? Math.sin(t * 2.2) * .12 : Math.sin(t * bpm / 60 * PI * .5) * .22; a.sh.rotation.x = lerp(-.95 + work, -3.0 + Math.sin(t * 9) * .25, up); a.sh.rotation.z = a.sx * lerp(-.1, .35, up); a.el.rotation.x = lerp(-.55, -.2, up) });
    body.rotation.z = Math.sin(t * bpm / 60 * PI * .5) * .04;
  }
}
const orig = MM.update;
MM.update = function (dt, t) { if (W.root.visible && yard.visible) { try { tick() } catch (e) { if (!tick.w) { tick.w = true; console.warn('[rave-stage]', e) } } } return orig.call(this, dt, t) };
window.AshfallRaveStage = { cfg, group: S };
})();
