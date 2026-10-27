/* EYE FX: backlit glowing eyes, real blinking, micro-saccades and reaction flashes for every robot and chicken-bot (player, menu avatar, lobby bots, arena fighters).
   Eyes are found through a tag on their materials (userData.eye = 'lens' | 'visor' | 'led'; set in models-core.js and scene.js) whenever a model is built or rebuilt.
   - GLOW: every eye gets its own copy of its material with an independent emissive colour + intensity (a backlight that ignores the room's lighting), an optional pulse, an optional
     beat pulse from the rave music and a soft additive halo sprite (the bloom strength).
   - BLINK: physical lens eyes squash vertically over ~0.15 s every 2-6 s; digital visor eyes (dot-matrix LCD) do a scanline collapse in the shader (no geometry moves) or a pixel flicker.
   - SACCADES: tiny darting shifts of the eye while idling (position for lenses, UV shift for the LCD visor).
   - STATES: AshfallEyeFX.flash(root, 'hit' | 'power' | 'alert', ms) flashes a character's eyes (hit = hazard red, power = bright white-cyan, alert = amber); the fight AI calls it.
   - CROWD COST: one manager loop over flat arrays of eyes, no allocations per frame, eyes far from the camera are skipped. Controls: dev menu (9) > EYES. */
(() => {
'use strict';
const T = window.THREE, hub = window.AshfallHubScene, MM = window.AshfallMainMenu;
if (!T || !hub || !MM || typeof MM.update !== 'function') return;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
const COLORS = { green: 0x39ff6a, red: 0xff2a1a, amber: 0xffa820, cyan: 0x25e8ff, magenta: 0xff2ea6, white: 0xffffff };
const cfg = {
  enabled: true,
  glow: true, color: 'default', intensity: 2.2, pulse: true, pulseHz: .6, pulseDepth: .35, beat: true, beatAmount: 1.2, halo: true, haloStrength: .7,
  blinkAnalog: true, blinkDigital: true, digitalStyle: 'scan', blinkMin: 2, blinkMax: 6, blinkTime: .15,
  saccades: true, saccadeAmount: 1, saccadeRate: 1,
  states: true, flashStrength: 3, flashTime: .6,
  cullDistance: 70
};
const defaults = Object.freeze({ ...cfg });
const eyes = [], roots = new Map(), pending = new Set(), eyeOwners = new WeakMap(), flashCol = { hit: new T.Color(0xff1a10), power: new T.Color(0xbff6ff), alert: new T.Color(0xffa020) };
const tint = new T.Color(), tmpV = new T.Vector3(), camPos = new T.Vector3(), tmpQ = new T.Quaternion(), tmpC = new T.Color();
const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c) })();
const haloMats = [];

// ---- digital eyes: the LCD visor shader collapses vertically (scanline blink) and shifts sideways (saccade) -----------------------------------------------------------------------------------------
function digitalMaterial(mat, rec) {
  const m = mat.clone(); rec.uBlink = { value: 0 }; rec.uSac = { value: new T.Vector2() };
  m.onBeforeCompile = sh => {
    sh.uniforms.uBlink = rec.uBlink; sh.uniforms.uSac = rec.uSac;
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uBlink; uniform vec2 uSac; vec2 eyeUv(vec2 uv){ float k = max(.03, 1. - uBlink); return vec2(uv.x + uSac.x, .5 + (uv.y - .5) / k + uSac.y); }\nvoid main() {')
      .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace(/vMapUv/g, 'eyeUv(vMapUv)'))
      .replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment.replace(/vEmissiveMapUv/g, 'eyeUv(vEmissiveMapUv)'));
  };
  m.customProgramCacheKey = () => 'eyefx-digital'; m.needsUpdate = true; return m;
}
// ---- registration ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function ownMaterial(rec) {
  const mesh = rec.mesh, cur = mesh.material;
  if (eyeOwners.get(cur) === rec) return;
  const src = cur, m = rec.kind === 'visor' && src.map && !src.isMeshBasicMaterial ? digitalMaterial(src, rec) : src.clone();
  // Keep the tracking reference outside material.userData: Three.js serializes userData on clone.
  mesh.material = m; eyeOwners.set(m, rec); rec.mat = m; rec.baseE = m.emissive ? m.emissive.clone() : null; rec.baseEI = m.emissiveIntensity ?? 1; rec.baseC = m.color.clone(); rec.base = rec.kind === 'visor' ? 1 : 0;
}
function register(mesh, root) {
  const prior=eyeOwners.get(mesh.material);if(prior?.mesh===mesh&&prior.source)mesh.material=prior.source;
  const kind = mesh.material.userData.eye, rec = { mesh, root, kind, source: mesh.material, mat: null, uBlink: null, uSac: null, phase: Math.random() * 6.28, next: performance.now() / 1000 + rnd(.5, 5), blinkT: -1, nextSac: rnd(.4, 2), sacT: 0, sx: 0, sy: 0, tx: 0, ty: 0, flashUntil: 0, flashKind: 'hit', halo: null, axis: 1, bx: mesh.position.x, by: mesh.position.y, bz: mesh.position.z, sc: mesh.scale.clone() };
  const up = tmpV.set(0, 1, 0), q = mesh.quaternion; let best = 0, bd = -1; for (let a = 0; a < 3; a++) { const v = new T.Vector3(a === 0, a === 1, a === 2).applyQuaternion(q); const d = Math.abs(v.y); if (d > bd) { bd = d; best = a } } rec.axis = best;      // the mesh axis that points up on screen = the eyelid axis
  ownMaterial(rec); eyes.push(rec); let list = roots.get(root); if (!list) roots.set(root, list = []); list.push(rec);
  if (kind === 'lens' || kind === 'led') { const hm = new T.SpriteMaterial({ map: haloTex, color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }); haloMats.push(hm); const s = new T.Sprite(hm); s.renderOrder = 6; const ws = mesh.getWorldScale(tmpV).x || 1; s.userData.k = 1 / Math.max(.05, ws); s.position.copy(mesh.position); s.position.z += 0; mesh.parent?.add(s); rec.halo = s }
}
function scan(root) {
  if (!root) return;
  const found=[];root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&o.material?.userData?.eye&&!o.userData.eyeIgnore)found.push(o)});
  const old=roots.get(root),same=old&&old.length===found.length&&found.every((mesh,i)=>old[i]?.mesh===mesh&&eyeOwners.get(mesh.material)===old[i]);
  if(same)return;
  if(old){for(const r of old){if(eyeOwners.get(r.mesh.material)===r){eyeOwners.delete(r.mesh.material);r.mesh.material=r.source}const i=eyes.indexOf(r);if(i>=0)eyes.splice(i,1);r.halo?.parent?.remove(r.halo)}roots.delete(root)}
  for(const mesh of found)register(mesh,root);
}
function queue(root) { if (!root || pending.has(root)) return; pending.add(root); setTimeout(() => { pending.delete(root); try { scan(root) } catch (e) { console.warn('[eye-fx]', e) } }, 60) }
function wrap(obj, name) { const o = obj?.[name]; if (typeof o !== 'function') return; obj[name] = function (root, ...a) { const r = o.call(this, root, ...a); queue(root); return r } }
wrap(window.AshfallModels, 'apply'); wrap(window.AshfallChickenModels, 'apply');
for (const t of [900, 2500, 6000]) setTimeout(() => { for (const r of [hub.robot, hub.bird]) queue(r) }, t);

// ---- flashes (state hooks) --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function flash(root, kind = 'hit', ms) {
  if (!cfg.enabled || !cfg.states) return; const until = performance.now() / 1000 + (ms ? ms / 1000 : cfg.flashTime);
  const list = roots.get(root); if (list) { for (const r of list) { r.flashUntil = until; r.flashKind = kind } return }
  root?.traverse?.(o => { const r = eyeOwners.get(o.material); if (r) { r.flashUntil = until; r.flashKind = kind } });
}
// ---- the manager loop ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let last = performance.now() / 1000; const stats = { eyes: 0, active: 0 };
function applyGlow(r, now, t, beat) {
  const m = r.mat, fl = now < r.flashUntil && cfg.states ? Math.max(0, (r.flashUntil - now) / cfg.flashTime) : 0;
  if (!m.emissive) return 0;
  let k = cfg.intensity * (cfg.pulse ? 1 + cfg.pulseDepth * Math.sin(t * cfg.pulseHz * 6.283 + r.phase) : 1) + (cfg.beat ? beat * cfg.beatAmount : 0);
  if (cfg.color === 'default') { if (r.kind === 'lens') tint.setHex(COLORS.green); else tint.copy(r.baseE); }
  else if (cfg.color === 'cycle') tint.setHSL((t * .08 + r.phase * .05) % 1, 1, .55); else tint.setHex(COLORS[cfg.color] ?? COLORS.green);
  if (fl > 0) { tmpC.copy(flashCol[r.flashKind] || flashCol.hit); tint.lerp(tmpC, Math.min(1, fl * 1.5)); k += fl * cfg.flashStrength }
  if (r.kind === 'visor' && cfg.color === 'default' && fl <= 0) { m.emissive.copy(r.baseE); m.emissiveIntensity = r.baseEI * (1 + (cfg.glow ? (k - cfg.intensity) * .25 : 0)); return 1 }
  m.emissive.copy(tint); m.emissiveIntensity = k; return clamp(k / 4, 0, 1.2);
}
function frame(dt) {
  const now = performance.now() / 1000, t = now, cam = hub.camera; cam.getWorldPosition(camPos); const lim = cfg.cullDistance * cfg.cullDistance, bs = window.AshfallRaveShow?.beatState, live = window.AshfallRaveShow?.playing, beat = live && bs ? bs.pulse : 0;
  let active = 0; stats.eyes = eyes.length;
  for (let i = eyes.length - 1; i >= 0; i--) {
    const r = eyes[i], mesh = r.mesh;
    if (!mesh.parent || !mesh.material) { r.halo?.parent?.remove(r.halo); eyes.splice(i, 1); continue }
    if (!cfg.enabled) { if (r.mat && r.glowOn) restore(r); continue }
    if (eyeOwners.get(mesh.material) !== r) ownMaterial(r);                                   // a repaint swapped the material: take it back
    mesh.getWorldPosition(tmpV); if (tmpV.distanceToSquared(camPos) > lim) { if (r.halo) r.halo.visible = false; continue }
    active++; r.glowOn = true;
    // glow + halo
    let glow = 0; if (cfg.glow || now < r.flashUntil) glow = applyGlow(r, now, t, beat); else if (r.baseE) { r.mat.emissive.copy(r.baseE); r.mat.emissiveIntensity = r.baseEI }
    if (r.halo) { const hm = r.halo.material, on = (cfg.halo && cfg.glow || now < r.flashUntil) && glow > .02; r.halo.visible = on; if (on) { hm.color.copy(r.mat.emissive); hm.opacity = clamp(glow * cfg.haloStrength * .55, 0, 1); r.halo.scale.setScalar((.34 + glow * .3 * cfg.haloStrength) * r.halo.userData.k); r.halo.position.set(mesh.position.x, mesh.position.y, mesh.position.z) } }
    // blink
    const digital = r.kind === 'visor', allow = digital ? cfg.blinkDigital : cfg.blinkAnalog, dur = Math.max(.04, cfg.blinkTime);
    if (allow && r.blinkT < 0 && now > r.next) r.blinkT = 0;
    let closed = 0; if (r.blinkT >= 0) { r.blinkT += dt; const u = r.blinkT / dur; if (u >= 1) { r.blinkT = -1; r.next = now + rnd(cfg.blinkMin, Math.max(cfg.blinkMin + .1, cfg.blinkMax)) } else closed = Math.sin(u * Math.PI) }
    if (digital) {
      if (r.uBlink) { r.uBlink.value = cfg.digitalStyle === 'scan' ? closed * .97 : 0; if (cfg.digitalStyle === 'flicker' && closed > 0) r.mat.emissiveIntensity *= (Math.floor(r.blinkT / dur * 6) % 2 ? .25 : 1) }
    } else {
      const s = 1 - closed * .93, ax = r.axis; mesh.scale.set(ax === 0 ? r.sc.x * s : r.sc.x, ax === 1 ? r.sc.y * s : r.sc.y, ax === 2 ? r.sc.z * s : r.sc.z);
    }
    // saccades: occasional tiny darts, eased
    if (cfg.saccades) {
      r.nextSac -= dt * cfg.saccadeRate; if (r.nextSac <= 0) { r.nextSac = rnd(.5, 2.6); r.tx = rnd(-1, 1) * (digital ? .02 : .006) * cfg.saccadeAmount; r.ty = rnd(-.6, .6) * (digital ? .02 : .006) * cfg.saccadeAmount }
      const e = 1 - Math.exp(-dt * 40); r.sx += (r.tx - r.sx) * e; r.sy += (r.ty - r.sy) * e;
      if (digital) { if (r.uSac) r.uSac.value.set(r.sx, r.sy) } else { mesh.position.x = r.bx + r.sx; mesh.position.y = r.by + r.sy }
    } else if (digital) { if (r.uSac) r.uSac.value.set(0, 0) } else { mesh.position.x = r.bx; mesh.position.y = r.by }
  }
  stats.active = active;
}
function restore(r) {
  r.glowOn = false; if (r.baseE) { r.mat.emissive.copy(r.baseE); r.mat.emissiveIntensity = r.baseEI } if (r.uBlink) { r.uBlink.value = 0; r.uSac.value.set(0, 0) } r.mesh.scale.copy(r.sc); r.mesh.position.set(r.bx, r.by, r.bz); if (r.halo) r.halo.visible = false;
}
const orig = MM.update;
MM.update = function (dt, tt) { const now = performance.now() / 1000, d = Math.min(.1, now - last); last = now; try { frame(d) } catch (e) { if (!frame.w) { frame.w = true; console.warn('[eye-fx]', e) } } return orig.call(this, dt, tt) };
window.AshfallEyeFX = { cfg, defaults, stats, flash, scan, queue, resetDefaults() { Object.assign(cfg, defaults); queue(hub.robot); queue(hub.bird); return cfg }, flashAll(kind = 'hit') { for (const r of eyes) { r.flashUntil = performance.now() / 1000 + cfg.flashTime; r.flashKind = kind } }, get eyes() { return eyes } };
})();
