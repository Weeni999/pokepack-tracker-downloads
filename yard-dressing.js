/* YARD DRESSING: turns the in-game yard into the underground robot-chicken fight lobby: neon COCKPIT / CUSTOMIZE / OPTIONS / BETTING signs, a wire-mesh fight ring with two sparring
   chicken-bots under a hanging betting board and monitors, a shouting crowd, a sparking repair bench, stacked cages with caged bots, a spectator catwalk, floodlight cones, drifting
   smoke and floor clutter. Everything is added to the existing yard group (AshfallWorldLayout.yard), so it streams with the yard, is pre-warmed with it, and does not touch
   the collision rules in lobby-config.js (the ring sits on the existing STAGE obstacle). Heavy parts (chicken-bots) are built lazily, one per frame, the first time the yard is visible. */
(() => {
'use strict';
const hub = window.AshfallHubScene, T = window.THREE, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu;
if (!hub || !T || !W?.yard || !MM || typeof MM.update !== 'function') return;
const yard = W.yard, PI = Math.PI, rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);
const D = new T.Group(); D.name = 'YARD_DRESSING'; yard.add(D);

// ---- tiny helpers ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const mats = {};
const M = (key, color, rough = .7, metal = .4, extra = {}) => mats[key] || (mats[key] = new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m };
const box = (p, w, h, d, mat, x, y, z, rx, ry, rz) => add(p, new T.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
const cyl = (p, rt, rb, h, mat, x, y, z, rx, ry, rz, seg = 10) => add(p, new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, rx, ry, rz);
const sph = (p, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = add(p, new T.SphereGeometry(r, 12, 9), mat, x, y, z); m.scale.set(sx, sy, sz); return m };
const rod = (p, a, b, r, mat) => { const va = new T.Vector3(...a), vb = new T.Vector3(...b), len = va.distanceTo(vb), m = add(p, new T.CylinderGeometry(r, r, len, 6), mat); m.position.copy(va).lerp(vb, .5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); return m };
const tubeMesh = (p, pts, r, mat) => { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), 24, r, 5, false), mat); p.add(m); return m };
const steel = M('steel', 0x3d453b, .55, .75), dark = M('dark', 0x14181a, .75, .5), rust = M('rust', 0x7a4a2a, .9, .4), wire = M('wire', 0x8a9a8a, .5, .8), concrete = M('conc', 0x555a55, .95, .1), brass = M('brass', 0x7a6a3a, .5, .8);
const glow = (color, k = 1) => new T.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: k });

// ---- neon signs (outlined tube letters, own colour, flicker, real light) -----------------------------------------------------------------------------------------------------------------
const FONT = '900 230px Impact,"Arial Black","Franklin Gothic Heavy",sans-serif', CH = 330, PAD = 40, SPACING = .84;
const meas = document.createElement('canvas').getContext('2d'); meas.font = FONT;
function glyph(ch, hex) {
  const adv = Math.max(60, meas.measureText(ch).width), w = Math.ceil(adv + PAD * 2), c = document.createElement('canvas'); c.width = w; c.height = CH; const g = c.getContext('2d');
  g.font = FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = hex;
  for (const [blur, lw, a] of [[50, 15, .5], [28, 12, .7], [13, 10, .9]]) { g.globalAlpha = a; g.shadowColor = hex; g.shadowBlur = blur; g.lineWidth = lw; g.strokeText(ch, w / 2, CH / 2) }
  g.globalAlpha = 1; g.shadowBlur = 8; g.shadowColor = '#fff'; g.strokeStyle = '#f4fff6'; g.lineWidth = 3.4; g.strokeText(ch, w / 2, CH / 2);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return { tex: t, adv, w };
}
const signs = [], FX = { flicker: 1, lightScale: 1, clash: true, clashRate: 1, welding: true };
function neonSign(text, hex, lightHex, unit, x, y, z, ry, bad = -1, lightPower = 18) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.userData.ignorePsx = true; D.add(g);
  const parts = [...text].map((ch, i) => ch === ' ' ? { gap: true, adv: 60 } : { ch, ...glyph(ch, text === 'COCKPIT' && i >= 4 ? '#ff3b24' : hex) }), total = parts.reduce((a, p) => a + (p.gap ? p.adv : p.adv * SPACING), 0) * unit, letters = [];
  let px = -total / 2;
  parts.forEach((p, i) => {
    if (p.gap) { px += p.adv * unit; return }
    const mat = new T.MeshBasicMaterial({ map: p.tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = add(g, new T.PlaneGeometry(p.w * unit, CH * unit), mat, px + p.adv * .42 * unit, 0, .06); m.renderOrder = 7;
    letters.push({ mat, v: 1, bad: i === bad, burstEnd: 0, nextDrop: rnd() * 6 }); px += p.adv * SPACING * unit;
  });
  for (const sy of [-CH * unit * .3, CH * unit * .3]) box(g, total + .4, .05, .05, dark, 0, sy, -.03);
  for (const sx of [-1, 1]) { cyl(g, .03, .03, 1.2, steel, sx * (total / 2 + .1), CH * unit * .55, -.05, 0, 0, 0, 8); tubeMesh(g, [[sx * (total / 2 + .1), CH * unit * .6, -.05], [sx * (total / 2 + .2), CH * unit * .6 + .9, -.2], [sx * (total / 2 + .1), CH * unit * .6 + 1.6, -.5]], .02, dark) }
  const light = new T.PointLight(lightHex, lightPower, 14, 1.6); light.position.set(0, 0, 1.6); g.add(light);
  signs.push({ group: g, letters, light, base: lightPower, baseOrig: lightPower, mean: 1, until: 0 }); g.userData.w = total; g.userData.h = CH * unit * .62; return g;
}
neonSign('CUSTOMIZE', '#2bd6ff', 0x2ab8ff, .0058, -22.5, 4.7, -54, PI / 2, 4, 16);
// ---- the main menu lives in here: a fixed vantage by the entrance, the player's robot on a podium in front of the ring, and the three menu signs hung in view ----------------------------------------
const CAM_POS = new T.Vector3(5, 4.3, -41.5), CAM_LOOK = new T.Vector3(-5, 6.0, -60), AVATAR = new T.Vector3(-1, .25, -50);
const face = (x, z) => Math.atan2(CAM_POS.x - x, CAM_POS.z - z);
const menuSigns = {
  cockpit: neonSign('COCKPIT', '#2fff6a', 0x39ff6a, .0100, -7.5, 8.9, -55, face(-7.5, -55), 2, 34),
  // Keep secondary actions centered directly beneath the title and half the
  // previous letter size so they read as a subordinate menu, not a competing sign.
  options: neonSign('OPTIONS', '#6dff7a', 0x4dff72, .0026, -7.5, 6.65, -55, face(-7.5, -55), 2, 7),
  exit: neonSign('EXIT GAME', '#ff6a4a', 0xff5a3a, .0026, -7.5, 5.75, -55, face(-7.5, -55), 5, 7)
};
for (const k of Object.keys(menuSigns)) { const g = menuSigns[k]; menuSigns[k] = { group: g, w: g.userData.w, h: g.userData.h } }
{ const c = menuSigns.cockpit.group, w = menuSigns.cockpit.w; for (const sx of [-1, 1]) { const bx = c.position.x + Math.cos(c.rotation.y) * sx * w * .45, bz = c.position.z - Math.sin(c.rotation.y) * sx * w * .45; rod(D, [bx, c.position.y + .9, bz], [bx * .8 - 2, 24.6, bz - 1], .035, steel); rod(D, [bx, c.position.y + .9, bz], [bx * .8 + 2, 24.6, bz + 1], .035, dark) } }
{ const x = menuSigns.cockpit.group.position.x, z = menuSigns.cockpit.group.position.z + .18; box(D, 2.25, .045, .06, steel, x, 7.12, z); for (const sx of [-1, 1]) cyl(D, .028, .028, .14, brass, x + sx * 1.08, 7.12, z + .04, Math.PI / 2, 0, 0, 8) }
// the podium the robot stands on
const podium = new T.Group(); podium.position.set(AVATAR.x, 0, AVATAR.z); D.add(podium);
cyl(podium, 1.7, 1.85, .28, dark, 0, .14, 0, 0, 0, 0, 40); add(podium, new T.TorusGeometry(1.5, .05, 8, 48), new T.MeshStandardMaterial({ color: 0x1a2a1c, emissive: 0x39ff6a, emissiveIntensity: 1.4 }), 0, .3, 0, PI / 2, 0, 0); cyl(podium, 1.2, 1.3, .06, steel, 0, .31, 0, 0, 0, 0, 36);
const podLight = new T.PointLight(0xffe0a8, 22, 12, 1.5); podLight.position.set(0, 6.5, 1.2); podium.add(podLight);
const podCone = add(podium, new T.ConeGeometry(2.6, 6.4, 24, 1, true), new T.MeshBasicMaterial({ color: 0xffe0a8, transparent: true, opacity: .06, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), 0, 3.4, 0); podCone.rotation.x = PI;
const CM = window.AshfallCinematicMenu; if (CM) { CM.cameraPosition.copy(CAM_POS); CM.cameraTarget.copy(CAM_LOOK) }
neonSign('BETTING', '#ff4b3a', 0xff3a2a, .0074, 22.5, 4.8, -69, -PI / 2, 3, 20);

// ---- fight ring at the STAGE obstacle (-8, -74), r 2.4: cage wall, floor, hanging board + monitors, two caged-up chicken-bots ----------------------------------------------------------------------
const RC = new T.Vector3(0, 0, -62), ring = new T.Group(); ring.position.copy(RC); ring.scale.setScalar(1.5); D.add(ring);   // the warehouse's centrepiece: the ring is 1.5x the size it was designed at
cyl(ring, 2.5, 2.6, .12, dark, 0, .06, 0, 0, 0, 0, 40); add(ring, new T.RingGeometry(.2, 2.3, 40), M('ringmark', 0x241a14, .9, .2, { side: T.DoubleSide }), 0, .125, 0, -PI / 2);
{ const R = 2.45; for (let i = 0; i < 48; i++) { const a = i / 48 * PI * 2; cyl(ring, .018, .018, 2.9, wire, Math.cos(a) * R, 1.5, Math.sin(a) * R, 0, 0, 0, 5) }
  for (const y of [.12, 1.0, 1.9, 2.95]) add(ring, new T.TorusGeometry(R, .04, 6, 48), steel, 0, y, 0, PI / 2, 0, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; cyl(ring, .07, .07, 3.1, steel, Math.cos(a) * R, 1.55, Math.sin(a) * R, 0, 0, 0, 8) }
  for (let i = 0; i < 6; i++) { const a = (i + .5) / 6 * PI * 2 + .3; box(ring, 1.4, .8 + rnd() * .5, .06, rust, Math.cos(a) * (R + .06), .45, Math.sin(a) * (R + .06), 0, -a + PI / 2, 0) } }
const spot = new T.PointLight(0xffe2a0, 22, 12, 1.5); spot.position.set(0, 4.8, 0); ring.add(spot);
const cone = add(ring, new T.ConeGeometry(2.9, 5, 28, 1, true), new T.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: .07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), 0, 4.3, 0); cone.rotation.x = PI;
// hanging betting board and monitors on chains from the girders
const boardCanvas = document.createElement('canvas'); boardCanvas.width = 512; boardCanvas.height = 256; const bctx = boardCanvas.getContext('2d'), boardTex = new T.CanvasTexture(boardCanvas); boardTex.colorSpace = T.SRGBColorSpace;
const bots = ['SLAG-4', 'RUSTY', 'VOLT', 'GIZMO', 'HAMMER'];
function drawBoard() { const g = bctx; g.fillStyle = '#05080a'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#e8eef0'; g.font = '700 34px monospace'; g.fillText('BETTING', 18, 42); g.fillStyle = '#6a7a80'; g.font = '16px monospace'; g.fillText('BOT', 20, 76); g.fillText('ODDS', 240, 76); g.fillText('STATUS', 380, 76);
  bots.forEach((b, i) => { const y = 108 + i * 28, odds = (1.2 + rnd() * 6).toFixed(2); g.fillStyle = i % 2 ? '#ff5a4a' : '#6dff7a'; g.font = '20px monospace'; g.fillText(b, 20, y); g.fillText(odds, 240, y); g.fillStyle = '#c8d0d2'; g.fillText(i === 0 ? 'FIGHTING' : i === 1 ? 'FIGHTING' : 'OPEN', 380, y) }); boardTex.needsUpdate = true }
drawBoard();
const board = new T.Group(); board.userData.ignorePsx = true; board.position.set(0, 5.1, 0); ring.add(board); box(board, 4.4, 2.2, .18, dark, 0, 0, 0); box(board, 4.6, .08, .22, steel, 0, 1.12, 0); box(board, 4.6, .08, .22, steel, 0, -1.12, 0);
add(board, new T.PlaneGeometry(4.1, 2.05), new T.MeshBasicMaterial({ map: boardTex, toneMapped: false }), 0, 0, .1);
for (const sx of [-1, 1]) rod(ring, [sx * 1.9, 5.6, 0], [sx * 2.1, 17, 0], .025, steel);
function monitor(x, y, z, ry, w = 1.2, tint = '#3fc0ff') {
  const c = document.createElement('canvas'); c.width = 128; c.height = 80; const g = c.getContext('2d'); for (let i = 0; i < 80; i += 2) { g.fillStyle = `rgba(${tint === '#3fc0ff' ? '60,180,255' : '255,180,60'},${.15 + rnd() * .5})`; g.fillRect(0, i, 128, 1 + rnd() * 3) } g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(40, 25, 48, 22);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const m = new T.Group(); m.userData.ignorePsx = true; m.position.set(x, y, z); m.rotation.y = ry; ring.add(m); box(m, w + .12, w * .66 + .12, .2, dark, 0, 0, 0); add(m, new T.PlaneGeometry(w, w * .66), new T.MeshBasicMaterial({ map: t, toneMapped: false }), 0, 0, .11); rod(ring, [x, y + .5, z], [x * .7, 17, z * .7], .02, steel); return m;
}
monitor(-3.2, 4.4, 1.4, .8); monitor(3.0, 4.2, 1.8, -.7, 1.0, '#ffb43a'); monitor(-2.4, 3.6, -2.2, 2.4, .9); monitor(2.6, 3.9, -2.0, -2.5, 1.1, '#ffb43a');
// sparring chicken-bots (built lazily)
const fighters = [];
function buildBots() {
  const C = window.AshfallChickenModels; if (!C?.apply) return false;
  const n = C.count || 5, m0 = Math.floor(Math.random() * n), m1 = (m0 + 1 + Math.floor(Math.random() * Math.max(1, n - 1))) % n, hc = () => '#' + new T.Color().setHSL(Math.random(), .4 + Math.random() * .35, .28 + Math.random() * .28).getHexString();
  const specs = [{ model: String(m0), x: -1.0, ry: PI / 2 + .1, color: [hc(), hc()] }, { model: String(m1), x: 1.0, ry: -PI / 2 - .1, color: [hc(), hc()] }];
  for (const [i, s] of specs.entries()) { const h = new T.Group(); h.position.set(s.x, .12, 0); h.rotation.y = s.ry; h.scale.setScalar(.62); ring.add(h);
    try { C.apply(h, { model: s.model, finish: s.color[0], secondary: s.color[1], panelColor: '#17201f', trimColor: '#b68a4d', bootColor: '#2a2018', lens: i ? '#ff5a3a' : '#6affdc' }, 'yard-fighter-' + i); fighters.push({ h, base: h.position.clone(), baseRy: s.ry, side: i ? 1 : -1, phase: i * 1.7 }) } catch (e) { console.warn('[yard-dressing] fighter', e) } }
  return fighters.length > 0;
}
// sparks where they clash
const SPN = 60, spPos = new Float32Array(SPN * 3).fill(-50), spVel = new Float32Array(SPN * 3), spLife = new Float32Array(SPN), spAge = new Float32Array(SPN).fill(99);
const spGeo = new T.BufferGeometry(); spGeo.setAttribute('position', new T.BufferAttribute(spPos, 3)); const sparks = new T.Points(spGeo, new T.PointsMaterial({ color: 0xffc860, size: .12, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false })); sparks.frustumCulled = false; D.add(sparks);
let spk = 0;
function emitSparks(x, y, z, n) { for (let i = 0; i < n; i++) { const k = spk = (spk + 1) % SPN; spPos.set([x, y, z], k * 3); spVel.set([(Math.random() - .5) * 3, 1 + Math.random() * 2.5, (Math.random() - .5) * 3], k * 3); spLife[k] = .35 + Math.random() * .4; spAge[k] = 0 } }

// ---- people: crowd around the ring, mechanics at the bench, spectators on the catwalk ------------------------------------------------------------------------------------------------------------------
const skin = [0xc89a78, 0x8d6044, 0xe0b898, 0x5a3c2c], cloth = [0x2a2f2c, 0x4a3a2a, 0x203a40, 0x5a2a24, 0x3a3a22, 0x30242e];
const people = [];
// every spectator is rolled fresh at load: any hue for clothes, a full range of skin tones, hair (or none), caps in loud colours, and different heights and builds
const rc = () => new T.Color().setHSL(Math.random(), .2 + Math.random() * .6, .12 + Math.random() * .4), rskin = () => new T.Color().setHSL(.03 + Math.random() * .07, .2 + Math.random() * .45, .16 + Math.random() * .58);
const HAIR = [0x15110e, 0x2b1d12, 0x4a3020, 0x7a5a30, 0xc8a050, 0xb04a28, 0x8a8a8a, 0xe8e8e8], rhair = () => Math.random() < .14 ? new T.Color().setHSL(Math.random(), .9, .5) : new T.Color(HAIR[Math.floor(Math.random() * HAIR.length)]);
function person(parent, x, y, z, ry, { cheer = true, scale = 1 } = {}) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.set(scale * (.85 + Math.random() * .3) * (.85 + Math.random() * .35), scale * (.86 + Math.random() * .3), scale * (.85 + Math.random() * .3) * (.85 + Math.random() * .35)); parent.add(g);
  const c = new T.MeshStandardMaterial({ color: rc(), roughness: .85, metalness: .1 }), s = new T.MeshStandardMaterial({ color: rskin(), roughness: .8, metalness: .05 });
  for (const sx of [-1, 1]) box(g, .22, .85, .24, c, sx * .15, .43, 0);
  add(g, new T.CapsuleGeometry(.27, .5, 4, 8), c, 0, 1.17, 0); sph(g, .19, s, 0, 1.78, 0);
  if (Math.random() < .5) cyl(g, .2, .22, .1, new T.MeshStandardMaterial({ color: rc().offsetHSL(0, .2, .1), roughness: .8, metalness: .2 }), 0, 1.95, 0, 0, 0, 0, 10); else if (Math.random() < .7) add(g, new T.SphereGeometry(.205, 10, 6, 0, PI * 2, 0, PI * .55), new T.MeshStandardMaterial({ color: rhair(), roughness: .9 }), 0, 1.84, 0);
  const arms = [-1, 1].map(sx => { const a = new T.Group(); a.position.set(sx * .34, 1.5, 0); g.add(a); box(a, .13, .62, .13, c, 0, -.3, 0); box(a, .11, .1, .11, s, 0, -.64, 0); return a });
  people.push({ g, arms, phase: rnd() * 6.3, cheer, rate: 4 + rnd() * 3 }); return g;
}
 // Adjustable crowds are instanced in two groups: floor spectators around the cage and champion crown podium, plus scaffold/catwalk spectators.
const CROWD = [], FLOOR_CAPACITY = 160, SCAFFOLD_CAPACITY = 2000;
const crowdSettings = { floor: 64, scaffold: 18 };
try { Object.assign(crowdSettings, JSON.parse(localStorage.getItem('ashfall_crowd_population_v1') || '{}')) } catch {}
crowdSettings.floor = Math.max(0, Math.min(FLOOR_CAPACITY, Math.round(Number(crowdSettings.floor) || 0)));
crowdSettings.scaffold = Math.max(0, Math.min(SCAFFOLD_CAPACITY, Math.round(Number(crowdSettings.scaffold) || 0)));
const galleries = window.AshfallWarehouse?.galleries || [];
function faceTarget(x, z, tx, tz) { return Math.atan2(tx - x, tz - z) }
function crowdPoint(center, i, perCenter, innerRadius, spacing) {
  const row = Math.floor(i / 32), slot = i % 32, a = slot / 32 * PI * 2 + row * .115 + (rnd() - .5) * .075;
  const r = innerRadius + row * spacing + (rnd() - .5) * .34, x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
  return [x, 0, z, faceTarget(x, z, center.x, center.z), 1];
}
for (let i = 0; i < FLOOR_CAPACITY; i++) {
  const podium = i % 2 === 1, localIndex = Math.floor(i / 2), anchor = podium ? { x: AVATAR.x, z: AVATAR.z } : { x: RC.x, z: RC.z };
  CROWD.push(crowdPoint(anchor, localIndex, FLOOR_CAPACITY / 2, podium ? 2.8 : 5.1, .92));
}
const SCAFFOLD = [];
function layoutScaffoldCrowd(count) {
  SCAFFOLD.length = 0;
  const lanes = 6, active = Math.max(0, Math.min(SCAFFOLD_CAPACITY, Math.round(count)));
  for (let i = 0; i < SCAFFOLD_CAPACITY; i++) {
    let x, y, z;
    if (galleries.length && i < active) {
      const galleryIndex = i % galleries.length, local = Math.floor(i / galleries.length), g = galleries[galleryIndex];
      const inGallery = Math.ceil((active - galleryIndex) / galleries.length);
      let lane, along, row = 0, rows = 1;
      if (inGallery <= lanes) {
        lane = inGallery <= 1 ? Math.random() : local / (inGallery - 1) * (lanes - 1);
        along = inGallery <= 1 ? .5 : .07 + .86 * local / (inGallery - 1);
      } else {
        lane = local % lanes;
        row = Math.floor(local / lanes); rows = Math.ceil(inGallery / lanes);
        const stagger = lane % 2 ? .28 : -.28;
        along = Math.max(.015, Math.min(.985, (row + .5 + stagger) / rows));
      }
      // Each gallery platform is 4.2 units wide. Keep all crowd centers inside its rails,
      // with a small edge margin; alternate rows are staggered below to avoid a rigid grid.
      const laneSpacing = 2.96 / Math.max(1, lanes - 1), zSpacing = Math.max(.48, (g.z1 - g.z0 - 2.2) / rows);
      const cross = Math.max(-1.58, Math.min(1.58, -1.48 + lane * laneSpacing + (Math.random() - .5) * Math.min(.18, laneSpacing * .3)));
      const alongJitter = inGallery <= lanes ? (Math.random() - .5) * .025 : (Math.random() - .5) * Math.min(.22, zSpacing * .3) / Math.max(1, g.z1 - g.z0 - 2.2);
      along = Math.max(.015, Math.min(.985, along + alongJitter));
      z = g.z0 + 1.1 + along * Math.max(0, g.z1 - g.z0 - 2.2);
      x = g.x - g.side * cross; y = g.y + .08;
    } else {
      x = 0; y = -100; z = 0;
    }
    SCAFFOLD.push([x, y, z, faceTarget(x, z, RC.x, RC.z), .92]);
  }
}
layoutScaffoldCrowd(crowdSettings.scaffold);

// Every crowd member is dressed from one of three wardrobes, rolled fresh at load:
//   HYPE  - oversized hoodie (hood up or down) or puffer vest in loud brand colours, snapback / beanie, gold chain, fat white or neon sneakers, shorts or baggy pants
//   RAVE  - neon vest, glowing LED visor, glow belt and wrist bands, neon shorts, platform boots, bucket hat, dyed hair
//   PLAIN - ordinary street clothes
const BRAND = [0x0b0b0d, 0xf2f2ee, 0xd8201c, 0x1c4fd8, 0xff7a10, 0xe8dcb8, 0x9ae020, 0x7a2ad8, 0xf06a9a, 0x1a8a5a, 0xf0c010], NEON = [0xff2ea6, 0x18f0ff, 0x7dff1c, 0xa23cff, 0xffe81a, 0xff5a1c, 0x2f7bff];
const pick = a => a[Math.floor(Math.random() * a.length)], col = h => new T.Color(h), glowCol = h => new T.Color(h).multiplyScalar(1.5);
function makeCrowdMeshes(label, capacity) {
  const bodyMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: .05 }), headMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .8 });
  const glowMat = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), goldMat = new T.MeshStandardMaterial({ color: 0xe0b030, roughness: .25, metalness: .95 });
  const I = (geo, mat) => new T.InstancedMesh(geo, mat, capacity);
  const meshes = {
    body: I(new T.CapsuleGeometry(.27, .5, 3, 8), bodyMat), legs: I(new T.BoxGeometry(.5, .85, .26), bodyMat), head: I(new T.SphereGeometry(.19, 10, 8), headMat),
    armL: I(new T.BoxGeometry(.13, .62, .13), bodyMat), armR: I(new T.BoxGeometry(.13, .62, .13), bodyMat),
    hair: I(new T.SphereGeometry(.205, 10, 6, 0, PI * 2, 0, PI * .55), headMat), hat: I(new T.CylinderGeometry(.2, .24, .1, 10), bodyMat),
    shins: I(new T.BoxGeometry(.48, .42, .24), headMat), shoeL: I(new T.BoxGeometry(.19, .12, .34), bodyMat), shoeR: I(new T.BoxGeometry(.19, .12, .34), bodyMat),
    vest: I(new T.BoxGeometry(.7, .52, .42), bodyMat), hood: I(new T.SphereGeometry(.21, 8, 6), bodyMat), chain: I(new T.TorusGeometry(.15, .02, 5, 12), goldMat),
    visor: I(new T.BoxGeometry(.36, .07, .06), glowMat), belt: I(new T.BoxGeometry(.64, .07, .4), glowMat), wristL: I(new T.BoxGeometry(.17, .09, .17), glowMat), wristR: I(new T.BoxGeometry(.17, .09, .17), glowMat)
  };
  for (const [key, mesh] of Object.entries(meshes)) { mesh.name = label + '_' + key.toUpperCase(); mesh.frustumCulled = false; mesh.castShadow = false; D.add(mesh) }
  const phases = [], off = new T.Color(0, 0, 0);
  for (let i = 0; i < capacity; i++) {
    const roll = Math.random(), style = roll < .34 ? 'hype' : roll < .68 ? 'rave' : 'plain', sk = rskin(), ph = { style, phase: Math.random() * 6.3, rate: 4 + Math.random() * 3, scale: .84 + Math.random() * .3, wide: .8 + Math.random() * .45, tall: .9 + Math.random() * .22, cheer: Math.random() < .8 };
    let top, pants, sleeves, shoe, hatC, hairC = rhair(), accent;
    ph.hat = ph.hair = ph.hood = ph.vest = ph.shorts = ph.chain = ph.visor = ph.belt = ph.wrist = ph.bucket = ph.platform = false; ph.bodyW = 1;
    if (style === 'hype') {
      top = col(pick(BRAND)); accent = col(pick(BRAND)); pants = Math.random() < .5 ? col(pick([0x0b0b0d, 0x3a3a3e, 0x5a6a50, 0x2a3a5a, 0xd8d0b8])) : rc(); sleeves = Math.random() < .75 ? top : accent;
      ph.bodyW = 1.12 + Math.random() * .16; ph.hood = Math.random() < .55; ph.vest = Math.random() < .35; ph.shorts = Math.random() < .3; ph.chain = Math.random() < .6; shoe = Math.random() < .6 ? col(0xf4f4f0) : col(pick(BRAND));
      ph.hat = Math.random() < .6; hatC = Math.random() < .5 ? accent : col(pick(BRAND)); ph.hair = !ph.hat && Math.random() < .75;
    } else if (style === 'rave') {
      top = Math.random() < .5 ? col(0x0b0b0d) : sk.clone(); accent = glowCol(pick(NEON)); pants = Math.random() < .55 ? col(pick(NEON)).multiplyScalar(.8) : col(0x0b0b0d); sleeves = Math.random() < .5 ? sk : top;
      ph.vest = true; ph.visor = Math.random() < .7; ph.belt = Math.random() < .7; ph.wrist = Math.random() < .8; ph.shorts = Math.random() < .65; shoe = col(pick(NEON)).multiplyScalar(.9); ph.platform = Math.random() < .55;
      ph.hat = Math.random() < .4; ph.bucket = ph.hat; hatC = col(pick(NEON)); ph.hair = !ph.hat && Math.random() < .85; if (Math.random() < .6) hairC = col(pick(NEON));
    } else {
      top = rc(); accent = rc(); pants = rc().multiplyScalar(.75); sleeves = Math.random() < .3 ? sk : Math.random() < .5 ? top : rc(); shoe = col(pick([0x15110e, 0x2a2a2a, 0x8a7a60, 0xf0f0f0]));
      ph.hat = Math.random() < .3; hatC = rc().offsetHSL(0, .25, .12); ph.hair = !ph.hat && Math.random() < .78;
    }
    const vestColor = style === 'rave' ? accent : accent.clone(), bandColor = glowCol(pick(NEON));
    meshes.body.setColorAt(i, top); meshes.legs.setColorAt(i, pants); meshes.armL.setColorAt(i, sleeves); meshes.armR.setColorAt(i, sleeves); meshes.head.setColorAt(i, sk); meshes.hair.setColorAt(i, hairC); meshes.hat.setColorAt(i, hatC);
    meshes.shins.setColorAt(i, ph.shorts ? sk : pants); meshes.shoeL.setColorAt(i, shoe); meshes.shoeR.setColorAt(i, shoe); meshes.vest.setColorAt(i, vestColor); meshes.hood.setColorAt(i, top);
    for (const k of ['visor', 'belt', 'wristL', 'wristR']) meshes[k].setColorAt(i, style === 'rave' ? bandColor : off);
    phases.push(ph);
  }
  return { meshes, phases, capacity };
}
const floorCrowd = makeCrowdMeshes('FLOOR_CROWD', FLOOR_CAPACITY), scaffoldCrowd = makeCrowdMeshes('SCAFFOLD_CROWD', SCAFFOLD_CAPACITY);
const tmpAM = new T.Matrix4(), tmpT2 = new T.Matrix4(), tmpM = new T.Matrix4(), tmpT = new T.Matrix4(), tmpA = new T.Matrix4(), tmpP = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpV = new T.Vector3(), tmpS = new T.Vector3(1, 1, 1), tmpE = new T.Euler();
function updateCrowdSet(points, state, count, t) {
  const meshes = state.meshes; count = Math.max(0, Math.min(state.capacity, Math.round(count)));
  Object.values(meshes).forEach(mesh => { mesh.count = count });
  const hide = (mesh, i, on, parent, tx, ty, tz, sx = 1, sy = 1, sz = 1, rx = 0) => { tmpM.copy(parent).multiply(tmpT.makeTranslation(tx, ty, tz)); if (rx) tmpM.multiply(tmpA.makeRotationX(rx)); const k = on ? 1 : 0; tmpM.multiply(tmpA.makeScale(sx * k, sy * k, sz * k)); mesh.setMatrixAt(i, tmpM) };
  for (let i = 0; i < count; i++) {
    const c = points[i], ph = state.phases[i], k = t * ph.rate + ph.phase, bob = ph.cheer ? Math.max(0, Math.sin(k * 2)) * .05 : 0;
    tmpQ.setFromAxisAngle(tmpV.set(0, 1, 0), c[3]); tmpP.compose(tmpV.set(c[0], c[1], c[2]), tmpQ, tmpS.set(ph.scale * c[4] * ph.wide, ph.scale * c[4] * ph.tall, ph.scale * c[4] * ph.wide));
    const P = tmpP, sh = ph.shorts;
    meshes.body.setMatrixAt(i, tmpM.copy(P).multiply(tmpT.makeTranslation(0, 1.17 + bob, 0)).multiply(tmpA.makeScale(ph.bodyW, 1, ph.bodyW)));
    meshes.legs.setMatrixAt(i, tmpM.copy(P).multiply(tmpT.makeTranslation(0, sh ? .64 : .43, 0)).multiply(tmpA.makeScale(ph.style === 'hype' ? 1.15 : 1, sh ? .5 : 1, 1)));
    hide(meshes.shins, i, sh, P, 0, .24, 0);
    meshes.head.setMatrixAt(i, tmpM.copy(P).multiply(tmpT.makeTranslation(0, 1.78 + bob, 0)));
    hide(meshes.hair, i, ph.hair, P, 0, 1.84 + bob, 0);
    hide(meshes.hat, i, ph.hat, P, 0, 1.99 + bob, 0, ph.bucket ? 1.5 : 1, ph.bucket ? .8 : 1, ph.bucket ? 1.5 : 1);
    const lift = ph.platform ? .1 : 0;
    hide(meshes.shoeL, i, true, P, -.15, .06 + lift * .5, .04, 1, ph.platform ? 1.9 : 1, 1); hide(meshes.shoeR, i, true, P, .15, .06 + lift * .5, .04, 1, ph.platform ? 1.9 : 1, 1);
    hide(meshes.vest, i, ph.vest, P, 0, 1.3 + bob, 0, ph.bodyW, 1, ph.bodyW);
    hide(meshes.hood, i, ph.hood, P, 0, 1.64 + bob, -.14, ph.bodyW, 1, 1);
    hide(meshes.chain, i, ph.chain, P, 0, 1.56 + bob, .17, 1, 1, 1, PI * .42);
    hide(meshes.visor, i, ph.visor, P, 0, 1.8 + bob, .17);
    hide(meshes.belt, i, ph.belt, P, 0, .98 + bob * .5, 0, ph.bodyW, 1, ph.bodyW);
    for (const [im, wm, sx, off] of [[meshes.armL, meshes.wristL, -1, 0], [meshes.armR, meshes.wristR, 1, 1.3]]) {
      const swing = ph.cheer ? -2.5 * (.55 + .45 * Math.sin(k + off)) + .2 : -.3;
      tmpE.set(swing, 0, sx * .12); tmpA.makeRotationFromEuler(tmpE); tmpA.setPosition(sx * .34 * (ph.style === 'hype' ? 1.2 : 1), 1.5 + bob, 0); tmpM.copy(tmpP).multiply(tmpA); tmpAM.copy(tmpM);
      im.setMatrixAt(i, tmpM.multiply(tmpT.makeTranslation(0, -.3, 0)));
      wm.setMatrixAt(i, tmpM.copy(tmpAM).multiply(tmpT.makeTranslation(0, -.46, 0)).multiply(tmpT2.makeScale(ph.wrist ? 1 : 0, ph.wrist ? 1 : 0, ph.wrist ? 1 : 0)));
    }
  }
  Object.values(meshes).forEach(mesh => { mesh.instanceMatrix.needsUpdate = true });
}
function updateCrowd(t) { updateCrowdSet(CROWD, floorCrowd, crowdSettings.floor, t); updateCrowdSet(SCAFFOLD, scaffoldCrowd, crowdSettings.scaffold, t) }
function setCrowdCount(kind, value) {
  const key = kind === 'scaffold' ? 'scaffold' : 'floor', cap = key === 'scaffold' ? SCAFFOLD_CAPACITY : FLOOR_CAPACITY;
  crowdSettings[key] = Math.max(0, Math.min(cap, Math.round(Number(value) || 0)));
  if (key === 'scaffold') layoutScaffoldCrowd(crowdSettings.scaffold);
  try { localStorage.setItem('ashfall_crowd_population_v1', JSON.stringify(crowdSettings)) } catch {}
  updateCrowd(performance.now() / 1000 - t0);
}
updateCrowd(0);
let crowdFrame = 0; let lastCrowdT = 0;
// ---- repair bench with welding sparks ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const bench = new T.Group(); bench.position.set(-18.4, 0, -61.4); D.add(bench);
box(bench, 3.4, .12, 1.5, M('bench', 0x5a4a3a, .9, .2), 0, 1.0, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(bench, .12, 1.0, .12, steel, sx * 1.55, .5, sz * .62);
box(bench, 3.2, .1, 1.3, rust, 0, .35, 0);
{ const body = M('botbody', 0x3a4a44, .6, .6); sph(bench, .35, body, -.3, 1.4, 0, 1.2, .8, .9); sph(bench, .16, M('botlens', 0xff5a3a, .3, .4, { emissive: 0xff3a20, emissiveIntensity: 1.2 }), -.08, 1.55, .25); rod(bench, [-.7, 1.1, .1], [-1.3, 1.25, .4], .03, steel); rod(bench, [.2, 1.1, -.1], [.8, 1.3, .3], .03, steel); box(bench, .4, .25, .25, dark, 1.1, 1.18, -.3); box(bench, .3, .3, .22, M('batt', 0x2a3a2a, .6, .5), 1.4, 1.2, .2) }
for (const [x, z, ry] of [[-1.7, 1.1, PI + .3], [-.5, 1.2, PI - .2]]) person(bench, x, 0, z, ry, { cheer: false });
const weld = new T.PointLight(0xffa040, 0, 9, 1.6); weld.position.set(-.35, 1.7, .2); bench.add(weld);
for (let i = 0; i < 14; i++) { const t = rnd(); box(D, .2 + t * .3, .12, .16 + t * .2, rnd() < .5 ? rust : steel, -17 + (rnd() - .5) * 5, .06, -58 + (rnd() - .5) * 6, 0, rnd() * 6, 0) }
for (let i = 0; i < 3; i++) cyl(D, .22, .22, .12, dark, -16.2 + i * .4, .08, -64.3 + rnd() * .3, PI / 2, 0, rnd(), 14);

// ---- stacked cages with caged bots on the west wall --------------------------------------------------------------------------------------------------------------------------------------------------------
const cages = [];
for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
  const g = new T.Group(); g.position.set(-21.5, .1 + row * 1.5, -45.2 - col * 2.3); D.add(g);
  for (const [w, h, d, x, y, z] of [[1.8, .06, 2.1, 0, 0, 0], [1.8, .06, 2.1, 0, 1.4, 0], [.06, 1.4, 2.1, .9, .7, 0], [.06, 1.4, 2.1, -.9, .7, 0]]) box(g, w, h, d, steel, x, y, z);
  for (let k = 0; k <= 10; k++) { cyl(g, .012, .012, 1.4, wire, .9, .7, -1.02 + k * .204, 0, 0, 0, 4) } for (let k = 0; k <= 8; k++) cyl(g, .012, .012, 2.1, wire, .9, .12 + k * .16, 0, PI / 2, 0, 0, 4);
  cages.push(g);
}
const cageBots = [];
function buildCageBots() { const C = window.AshfallChickenModels; if (!C?.apply) return false; let i = 0; for (const g of cages) { const h = new T.Group(); h.position.set(-.1, .1, 0); h.rotation.y = PI / 2 + (rnd() - .5) * .5; h.scale.setScalar(.34); g.add(h); try { C.apply(h, { model: String(Math.floor(Math.random() * (C.count || 5))), finish: '#' + new T.Color().setHSL(Math.random(), .35 + Math.random() * .4, .28 + Math.random() * .28).getHexString(), secondary: '#' + new T.Color().setHSL(Math.random(), .2 + Math.random() * .3, .5 + Math.random() * .25).getHexString(), panelColor: '#17201f', trimColor: '#b68a4d', bootColor: '#2a2018', lens: '#6affdc' }, 'yard-cage-' + (i++)); cageBots.push({ h, phase: rnd() * 6 }) } catch (e) { console.warn('[yard-dressing] cage', e) } } return cageBots.length > 0 }

// ---- catwalk with spectators on the east side ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
const walk = new T.Group(); walk.position.set(20.2, 5.3, -61); D.add(walk);
box(walk, 4.8, .16, 34, M('walk', 0x3a3d38, .8, .6), 0, 0, 0);
for (const z of [-17, -10, -3.4, 3.4, 8, 12, 16]) { cyl(walk, .09, .09, 5.3, steel, -2.3, -2.65, z, 0, 0, 0, 8); cyl(walk, .09, .09, 5.3, steel, 2.3, -2.65, z, 0, 0, 0, 8) }
for (let z = -17; z <= 17; z += 1.7) cyl(walk, .03, .03, 1, steel, -2.4, .55, z, 0, 0, 0, 6);
box(walk, .05, .05, 34, steel, -2.4, 1.05, 0); box(walk, .05, .05, 34, steel, -2.4, .5, 0);
// Scaffold and catwalk spectators are supplied by the adjustable instanced crowd above.
for (let i = 0; i < 5; i++) box(walk, .9, .5, .6, rust, 1.5, .33, -14 + i * 7 + rnd() * 2, 0, rnd() * .4, 0);

// ---- atmosphere: floodlight cones, ceiling pipes, pillars, floor clutter, drifting smoke, hanging chains -----------------------------------------------------------------------------------------------------------
const floods = [[0, 26, -62, 0xffd890, 90], [-14, 25, -48, 0xffb060, 40], [14, 25, -76, 0xffc070, 40], [18, 18, -60, 0xff4a3a, 22], [-18, 18, -58, 0x39ff63, 18]];
const floodLights = [];
for (const [x, y, z, color, power] of floods) {
  const l = new T.PointLight(color, power, y > 20 ? 48 : 30, 1.4); l.position.set(x, y - .3, z); D.add(l); box(D, .5, .3, .35, dark, x, y, z); box(D, .38, .22, .05, glow(color), x, y - .02, z + .2);
  const cn = add(D, new T.ConeGeometry(y > 20 ? 6.5 : 3.2, y - .5, 24, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: y > 20 ? .07 : .05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), x, (y - .5) / 2 + .25, z); cn.rotation.x = PI; floodLights.push({ light: l, cone: cn, base: power, color });
}
for (let i = 0; i < 40; i++) { const x = (rnd() - .5) * 40, z = -80 + rnd() * 40, k = rnd(); box(D, .15 + k * .5, .08 + k * .25, .12 + k * .4, [rust, steel, dark][i % 3], x, .08, z, 0, rnd() * 6, 0) }
for (let i = 0; i < 6; i++) tubeMesh(D, [[-20 + rnd() * 40, .03, -80 + rnd() * 38], [-20 + rnd() * 40, .08, -80 + rnd() * 38], [-20 + rnd() * 40, .03, -80 + rnd() * 38]], .035, i % 2 ? dark : M('cabR', 0x5a1f16, .8, .1));
for (let i = 0; i < 7; i++) { const p = add(D, new T.CircleGeometry(.6 + rnd() * 1.1, 20), new T.MeshStandardMaterial({ color: 0x0b0f0c, roughness: .08, metalness: .9, emissive: [0x103a20, 0x3a1810, 0x10283a][i % 3], emissiveIntensity: .5 }), -14 + rnd() * 28, .02, -78 + rnd() * 34, -PI / 2); p.renderOrder = 1 }
const SM = 420, smPos = new Float32Array(SM * 3), smSeed = [];
for (let i = 0; i < SM; i++) { smPos.set([(rnd() - .5) * 44, .5 + rnd() * 20, -81 + rnd() * 40], i * 3); smSeed.push(rnd() * 6.3) }
const smGeo = new T.BufferGeometry(); smGeo.setAttribute('position', new T.BufferAttribute(smPos, 3));
const smTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c) })();
const smoke = new T.Points(smGeo, new T.PointsMaterial({ map: smTex, color: 0x9a948a, size: 4.5, transparent: true, opacity: .13, depthWrite: false, sizeAttenuation: true })); smoke.frustumCulled = false; D.add(smoke);

// ---- animation (runs only while the yard is on screen) ---------------------------------------------------------------------------------------------------------------------------------------------------------------
let t0 = performance.now() / 1000, last = t0, lazy = 0, nextBoard = 0, nextSpark = 0, nextFlash = 0;
function step() {
  const now = performance.now() / 1000, dt = Math.min(.1, now - last); last = now; const t = now - t0;
  if (lazy === 0 && buildBots()) lazy = 1; else if (lazy === 1 && buildCageBots()) lazy = 2; else if (lazy < 2 && !window.AshfallChickenModels?.apply) lazy = 2;
  for (const s of signs) {
    let sum = 0; if (now > s.until && Math.random() < .08 * FX.flicker * dt) s.until = now + .1 + Math.random() * .25; const brown = now < s.until ? .4 + .3 * Math.random() : 1;
    for (const l of s.letters) { const hum = .95 + .05 * Math.sin(now * 100 + l.v * 7); if (now > l.burstEnd && FX.flicker > 0 && now > l.nextDrop) { l.burstEnd = now + (l.bad ? .12 + Math.random() * .3 : .05 + Math.random() * .1); l.nextDrop = now + (l.bad ? 1.5 + Math.random() * 4 : 12 + Math.random() * 30) / Math.max(.05, FX.flicker) } const sp = now < l.burstEnd ? (Math.random() < .5 ? .15 : .9) : 1; l.v += (hum * sp * brown - l.v) * Math.min(1, dt * 40); l.mat.opacity = Math.min(1, l.v); sum += l.v }
    s.mean = sum / s.letters.length; s.light.intensity = s.base * s.mean * s.mean * FX.lightScale * (window.AshfallRaveShow?.neonBoost ?? 1);
  }
  if (!window.AshfallFightAI?.active) for (const f of fighters) { const k = t * 2.4 + f.phase, lunge = Math.max(0, Math.sin(k)) ** 3; f.h.position.x = f.base.x + (-f.side) * (.05 + lunge * .5); f.h.position.y = f.base.y + Math.abs(Math.sin(k * .5)) * .08; f.h.rotation.y = f.baseRy + Math.sin(k * .7) * .12; window.AshfallChickenModels?.update?.(f.h, dt) }
  if (FX.clash && !window.AshfallFightAI?.active && fighters.length === 2 && now > nextSpark) { nextSpark = now + (.25 + Math.random() * .6) / Math.max(.1, FX.clashRate); emitSparks(RC.x + (Math.random() - .5) * .4, .9 + Math.random() * .4, RC.z + (Math.random() - .5) * .4, 10 + Math.floor(Math.random() * 12)) }
  for (const p of people) { if (!p.cheer) p.g.visible = crowdSettings.floor > 0; const k = t * p.rate + p.phase; if (p.cheer) { const up = .55 + .45 * Math.sin(k); p.arms[0].rotation.x = -2.5 * up + .2; p.arms[1].rotation.x = -2.5 * (.55 + .45 * Math.sin(k + 1.3)) + .2; p.g.position.y += (Math.max(0, Math.sin(k * 2)) * .06 - (p.g.position.y - (p.base ?? (p.base = p.g.position.y)))) * Math.min(1, dt * 10) } else { p.arms[0].rotation.x = -.6 + Math.sin(k * 2) * .4; p.arms[1].rotation.x = -.5 + Math.sin(k * 2 + 2) * .4; p.g.rotation.x = .1 + Math.sin(k) * .03 } }
  for (const c of cageBots) { c.h.position.y = .1 + Math.abs(Math.sin(t * 1.6 + c.phase)) * .03; c.h.rotation.y += Math.sin(t * .9 + c.phase) * .002; window.AshfallChickenModels?.update?.(c.h, dt) }
  const welding = FX.welding && Math.sin(t * 3.1) > -.2; weld.intensity = welding ? (6 + Math.random() * 10) : 0; if (welding && now > nextFlash) { nextFlash = now + .05; emitSparks(bench.position.x - .35, 1.45, bench.position.z + .2, 6) }
  for (let i = 0; i < SPN; i++) { if (spAge[i] >= spLife[i]) { if (spPos[i * 3 + 1] > -40) spPos[i * 3 + 1] = -50; continue } spAge[i] += dt; spVel[i * 3 + 1] -= 9 * dt; spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] = Math.max(.02, spPos[i * 3 + 1] + spVel[i * 3 + 1] * dt); spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt }
  spGeo.attributes.position.needsUpdate = true;
  if ((() => { const P = window.AshfallPerf, nt = performance.now() / 1000; if (!P || !P.cfg.crowdThrottle) return (crowdFrame++ & 1) === 0; if (nt - lastCrowdT >= 1 / Math.max(2, P.cfg.crowdHz)) { lastCrowdT = nt; return true } return false })()) updateCrowd(t);
  if (now > nextBoard) { nextBoard = now + 2.5; drawBoard() }
  for (let i = 0; i < SM; i++) { smPos[i * 3] += Math.sin(t * .1 + smSeed[i]) * .004; smPos[i * 3 + 1] += .0025; if (smPos[i * 3 + 1] > 21) smPos[i * 3 + 1] = .4 } smGeo.attributes.position.needsUpdate = true;
}
// the old rooster statue stood where the ring is now: hide it (its collision circle in lobby-config.js was enlarged to the ring's footprint)
let roosterDone = false;
function hideRooster() { const L = window.AshfallLobbyLayout?.root; if (!L) return; const B = new T.Box3(), c = new T.Vector3(), sz = new T.Vector3(); for (const o of L.children) { if (!o.isGroup) continue; B.setFromObject(o); if (B.isEmpty()) continue; B.getCenter(c); B.getSize(sz); if (Math.hypot(c.x - 0, c.z + 62) < 1.2 && sz.x > 3.5 && sz.x < 8 && sz.y > 3) { o.visible = false; roosterDone = true } } }
const orig = MM.update;
MM.update = function (dt, t) { if (!roosterDone && W.root.visible) hideRooster(); if (W.root.visible && yard.visible) { try { step() } catch (e) { if (!step.warned) { step.warned = true; console.warn('[yard-dressing]', e) } } } return orig.call(this, dt, t) };
window.AshfallYardDressing = { fx: FX, group: D, signs, people, fighters, menuSigns, floodLights, menuAvatarPos: AVATAR, menuCamera: { pos: CAM_POS, look: CAM_LOOK }, crowdSettings, setCrowdCount, crowdCapacity: { floor: FLOOR_CAPACITY, scaffold: SCAFFOLD_CAPACITY } };
})();




