/* PERF FX: runtime performance helpers for the lobby, each switchable in the dev menu (9) > PERFORMANCE.
   1. STATIC MERGE: after the scene has settled, meshes in the warehouse shell and yard dressing that never move (checked by comparing their world matrix a few seconds apart), are opaque, use only
      position / normal / uv attributes and share a material are baked into big merged meshes, one per material per 14 m cell. That turns thousands of draw calls into a few hundred, while the 14 m cells
      keep frustum culling working. The originals are only hidden, so switching the option off puts everything back.
   2. HIDDEN-FEED SKIP: the pit monitor's live render-to-texture feed re-renders the whole world 12 times a second; it is skipped whenever the arena it films is not on screen (fight-displays.js).
   3. HUB LIGHT CULL: the old hub world's lights (12 of them, one with a 2048 shadow map) still cost fragment-shader time in the lobby; they are switched off in the lobby and come back automatically when
      the character customizer / locker is open.
   4. CROWD THROTTLE: the instanced crowd animation updates at a capped rate (yard-dressing.js asks AshfallPerf.cfg.crowdHz).
   Nothing here allocates per frame. */
(() => {
'use strict';
const T = window.THREE, hub = window.AshfallHubScene, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu;
if (!T || !hub?.scene || !W?.yard || !MM || typeof MM.update !== 'function') return;
const yard = W.yard, scene = hub.scene, r = hub.renderer;
const cfg = { adaptive: true, targetFps: 60, merge: true, mergeDelay: 7, cullHubLights: true, skipHiddenFeeds: true, crowdHz: 24, crowdThrottle: true };
const stats = { merged: 0, hidden: 0, groups: 0, hubLights: 0, state: 'waiting' };
const ROOTS = ['WAREHOUSE_SHELL', 'YARD_DRESSING'], CELL = 14;
const merges = [];                                                    // { root, group, originals: [mesh], meshes: [merged] }

// ---- 1. static merge -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ALLOWED = new Set(['position', 'normal', 'uv']);
function chainOk(o, root) { for (let p = o; p && p !== root.parent; p = p.parent) { if (!p.visible || p.userData?.ignorePsx || p.userData?.noMerge) return false } return true }
function candidate(o, root) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.noMerge || o.userData.softOrig || o.userData.eyeOwner || o.layers.mask !== 1) return false;
  const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.isShaderMaterial || m.userData?.eye || m.userData?.eyeOwner) return false;
  const g = o.geometry; if (!g?.attributes?.position || !g.attributes.normal) return false; for (const k in g.attributes) if (!ALLOWED.has(k)) return false;
  if (g.morphAttributes && Object.keys(g.morphAttributes).length) return false; return chainOk(o, root);
}
function snapshot(root) { const out = new Map(); root.updateMatrixWorld(true); root.traverse(o => { if (candidate(o, root)) out.set(o, o.matrixWorld.elements.slice()) }); return out }
const same = (a, b) => { for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > 1e-5) return false; return true };
const _v = new T.Vector3(), _n = new T.Vector3(), _inv = new T.Matrix4(), _rel = new T.Matrix4(), _nm = new T.Matrix3();
function bake(list, root) {
  let vc = 0, ic = 0; for (const o of list) { const g = o.geometry; vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), idx = new Uint32Array(ic); let vo = 0, io = 0;
  _inv.copy(root.matrixWorld).invert();
  for (const o of list) {
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, n = P.count; _rel.multiplyMatrices(_inv, o.matrixWorld); _nm.getNormalMatrix(_rel);
    for (let i = 0; i < n; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_rel); pos[(vo + i) * 3] = _v.x; pos[(vo + i) * 3 + 1] = _v.y; pos[(vo + i) * 3 + 2] = _v.z;
      _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); nor[(vo + i) * 3] = _n.x; nor[(vo + i) * 3 + 1] = _n.y; nor[(vo + i) * 3 + 2] = _n.z;
      if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i) }
    }
    if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; io += g.index.count } else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n }
    vo += n;
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(new T.BufferAttribute(idx, 1));
  return geo;
}
let mergeState = 0, t0 = performance.now() / 1000, snaps = null, snapAt = 0;
function runMerge() {
  if (mergeState === 0 && performance.now() / 1000 - t0 > cfg.mergeDelay) { snaps = ROOTS.map(n => { const root = yard.getObjectByName(n); return root ? { root, map: snapshot(root) } : null }).filter(Boolean); snapAt = performance.now() / 1000; mergeState = 1; stats.state = 'watching for movement' }
  else if (mergeState === 1 && performance.now() / 1000 - snapAt > 4) {
    mergeState = 2; let total = 0;
    for (const { root, map } of snaps) {
      root.updateMatrixWorld(true); const buckets = new Map(), originals = [];
      for (const [o, el] of map) { if (!candidate(o, root) || !same(el, o.matrixWorld.elements)) continue; const e = o.matrixWorld.elements, key = [o.material.uuid, o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0, o.renderOrder, Math.floor(e[12] / CELL), Math.floor(e[13] / CELL), Math.floor(e[14] / CELL)].join('|'); let b = buckets.get(key); if (!b) buckets.set(key, b = []); b.push(o) }
      const group = new T.Group(); group.name = 'STATIC_MERGE_' + root.name; group.matrixAutoUpdate = false; group.userData.noMerge = true; yard.add(group); const rec = { root, group, originals, meshes: [] };
      for (const list of buckets.values()) { if (list.length < 2) continue; const geo = bake(list, root), m = new T.Mesh(geo, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder; m.matrixAutoUpdate = false; m.userData.noMerge = true; m.name = 'STATIC_MERGED'; group.add(m); rec.meshes.push(m); for (const o of list) originals.push(o); total += list.length }
      merges.push(rec);
    }
    stats.merged = total; stats.groups = merges.reduce((a, m) => a + m.meshes.length, 0); applyMerge(); stats.state = 'merged ' + total + ' meshes into ' + stats.groups + ' draw calls';
  }
}
let mergeApplied = null;
function applyMerge() {
  const on = cfg.merge && mergeState === 2; if (on === mergeApplied) return; mergeApplied = on;
  for (const m of merges) { for (const o of m.originals) o.visible = !on; m.group.visible = on }
}
function syncMergeVisibility() { for (const m of merges) if (cfg.merge) m.group.visible = m.root.visible && m.root.parent?.visible !== false }

// ---- 3. hub lights ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const hubLights = []; let lightScan = 0, lightsCulled = false, lightWant = false, lightSince = 0;
function findHubLights() { hubLights.length = 0; scene.traverse(o => { if (o.isLight && (o.isPointLight || o.isSpotLight) && !yard.getObjectById(o.id) && o.getWorldPosition(_v).z > -30 && o.intensity > 0) hubLights.push({ l: o, vis: o.visible }) }); stats.hubLights = hubLights.length }
function lockerOpen() { const el = document.getElementById('character-customize-overlay'); return (!!el && !el.hidden) || !!window.AshfallLockerStage?.active || window.AshfallSettings?.isOpen }
function lightTick(now) {
  if (now - lightScan > 5 && !lightsCulled) { lightScan = now; findHubLights() }
  const want = cfg.cullHubLights && W.root.visible && yard.visible && !lockerOpen();
  if (want !== lightWant) { lightWant = want; lightSince = now }
  if (want !== lightsCulled && now - lightSince > .6) { lightsCulled = want; for (const h of hubLights) h.l.visible = want ? false : h.vis; if (!want) lightScan = 0 }
}

// ---- measure ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function measure() { r.info.autoReset = false; r.info.reset(); const t = performance.now(); r.render(scene, hub.camera); const ms = performance.now() - t; const o = { calls: r.info.render.calls, triangles: r.info.render.triangles, cpuMs: +ms.toFixed(1), geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length || 0 }; r.info.autoReset = true; let lights = 0; scene.traverse(x => { if (x.isLight && x.visible && x.intensity > 0) lights++ }); o.lights = lights; return o }

// ---- 5. adaptive quality governor: when the measured frame time stays over budget it steps quality down (cheaper floor reflection, then none, then a lower render resolution, then no bloom); it steps back up slowly
const gov = { level: 0, ema: 16.7, evalAt: 0, changedAt: 0, last: 0, saved: null, status: 'idle' };
const basePR = () => Math.min(window.devicePixelRatio || 1, 1.7) * (window.AshfallSettings?.state?.resolutionScale || 1);
function govApply(level) {
  const FR = window.AshfallFloorReflect, fx = window.AshfallPSX?.fx;
  if (level > 0 && !gov.saved) gov.saved = { rs: FR?.cfg.resScale, rate: FR?.cfg.rate, en: FR?.cfg.enabled, bloom: fx?.bloom };
  const s = gov.saved || {};
  if (FR) { FR.cfg.resScale = level >= 1 ? Math.min(s.rs ?? .4, .3) : (s.rs ?? FR.cfg.resScale); FR.cfg.rate = level >= 1 ? Math.min(s.rate ?? 24, 15) : (s.rate ?? FR.cfg.rate); FR.cfg.enabled = level >= 2 ? false : (s.en ?? FR.cfg.enabled) }
  if (fx && s.bloom !== undefined) fx.bloom = level >= 4 ? false : s.bloom;
  gov.scale = level >= 4 ? .65 : level >= 3 ? .8 : 1; r.setPixelRatio(basePR() * gov.scale);
  if (level === 0) gov.saved = null; gov.level = level; gov.changedAt = performance.now() / 1000; gov.status = level ? 'level ' + level + ' (reduced quality to hold ' + cfg.targetFps + ' fps)' : 'full quality';
}
function govTick(now) {
  if (gov.last) { const ms = (now - gov.last) * 1000; if (ms < 250) gov.ema += (ms - gov.ema) * .04 } gov.last = now;
  if (!cfg.adaptive) { if (gov.level) govApply(0); gov.status = 'off'; return }
  if (now - gov.evalAt < 1.5) return; gov.evalAt = now; const budget = 1000 / cfg.targetFps;
  if (gov.level > 0 && Math.abs(r.getPixelRatio() - basePR() * gov.scale) > .01) r.setPixelRatio(basePR() * gov.scale);
  if (gov.ema > budget * 1.22 && gov.level < 4 && now - gov.changedAt > 2.5) govApply(gov.level + 1);
  else if (gov.level > 0 && gov.ema < budget * 1.06 && now - gov.changedAt > 25) govApply(gov.level - 1);
}
const orig = MM.update;
MM.update = function (dt, t) {
  const now = performance.now() / 1000; govTick(now);
  try { runMerge(); applyMerge(); if (merges.length && cfg.merge) syncMergeVisibility(); lightTick(now) } catch (e) { if (!MM.update.pw) { MM.update.pw = true; console.warn('[perf-fx]', e) } }
  return orig.call(this, dt, t);
};
window.AshfallPerf = { cfg, stats, gov, measure, rescanHubLights: findHubLights, get merges() { return merges } };
})();
