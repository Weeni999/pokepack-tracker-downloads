/* WORLD PRE-WARM: while the main menu sits idle, the yard / corridor / arena / plots, the player's robot and chicken, and every base model are drawn once, offscreen, in the
   exact lighting configuration the world will use (cockpit set hidden, world lights on). That compiles their shader programs, uploads geometry and textures to the GPU and
   allocates what the first world frame would otherwise have to create, so opening the gate and flying in does not stall.
   The browser has no scene streaming, so "persistent world" here means: one scene, one camera, one renderer for the whole session, with the world built at load and made ready
   in small time-sliced steps before the player clicks. Add ?prewarm=off to skip this (for measuring the difference). */
(() => {
'use strict';
if (new URLSearchParams(location.search).get('prewarm') === 'off') return;
const hub = window.AshfallHubScene, T = window.THREE, CM = window.AshfallCinematicMenu, MM = window.AshfallMainMenu, W = window.AshfallWorldLayout;
if (!hub || !T || !CM || !MM || !W || typeof MM.update !== 'function') return;
const { scene, camera, renderer } = hub;
const setRoot = scene.getObjectByName('COCKPIT_CINEMATIC_SET');
const rt = new T.WebGLRenderTarget(16, 16, { depthBuffer: true });
const stats = { slices: 0, total: 0, log: [], ready: false, started: 0 };

// ---- world-mode: the visibility every scene child has once the menu releases the scene ---------------------------------------------------------------------------------------
/* The world's lights are switched by lobby-layout (menu lights off, corridor lights by door state, TV glow by distance). Three.js recompiles every material whenever the visible light
   count changes, so each state is reproduced here and warmed: doors closed (red corridor lights) and doors open (green ones). */
function applyWorldLights(open) {
  const C = window.AshfallLobbyConfig, spawn = { x: -2.5, z: -34 };
  for (const l of hub.menuLights || []) l.visible = false;
  for (const light of W.corridor.children.filter(o => o.isLight)) light.visible = light.color.r > light.color.g ? !open : open;
  for (const tv of [window.AshfallTVs?.menu, window.AshfallTVs?.yard].filter(Boolean)) { if (tv.glow) tv.glow.visible = !!tv.screenOn && (C?.distance ? C.distance(spawn, tv.position) < 18 : false); if (tv.spill) tv.spill.visible = false }
}
function withWorldMode(show, fn, open = false) {
  const vis = CM.worldVisibility, saved = new Map(), culled = [];
  for (const c of scene.children) saved.set(c, c.visible);
  scene.traverse(o => { if (o.isLight) saved.set(o, o.visible) });
  const restore = () => { for (const [c, v] of saved) c.visible = v };
  try {
    for (const c of scene.children) if (vis?.has(c)) c.visible = vis.get(c);
    if (setRoot) setRoot.visible = false;
    applyWorldLights(open);
    show?.();
    scene.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) { culled.push([o, o.frustumCulled]); o.frustumCulled = false } });
    const oldAuto = renderer.shadowMap.autoUpdate, oldTarget = renderer.getRenderTarget();
    renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(rt);
    try { fn() } finally { renderer.setRenderTarget(oldTarget); renderer.shadowMap.autoUpdate = oldAuto }
  } finally { for (const [o, f] of culled) o.frustumCulled = f; restore() }
}
function drawOnce() { renderer.clear(); renderer.render(scene, camera) }

// ---- slices -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const slices = [];
const groupsOf = [['corridor', () => W.corridor], ['yard', () => W.yard], ['plots', () => W.plots], ['arena', () => W.arena]];
for (const open of [false, true]) for (const [name, get] of groupsOf) slices.push({ name: 'world:' + name + (open ? ':open' : ':closed'), run() { const g = get(); if (!g) return; withWorldMode(() => { W.root.visible = true; for (const [, o] of groupsOf) { const x = o(); if (x) x.visible = x === g } }, drawOnce, open); } });
function playerSlice(name, who, open) {
  return { name, run() {
    const robot = hub.robot, bird = hub.bird, parent = robot.parent, p = robot.position.clone(), r = robot.rotation.clone(), s = robot.scale.clone(), was = robot.visible, birdWas = bird?.visible;
    try { scene.add(robot); withWorldMode(() => { W.root.visible = false; robot.visible = who === 'robot'; if (bird) bird.visible = who === 'bird' }, drawOnce, open) }
    finally { parent?.add(robot); robot.position.copy(p); robot.rotation.copy(r); robot.scale.copy(s); robot.visible = was; if (bird) bird.visible = birdWas }
  } };
}
slices.push(playerSlice('robot:closed', 'robot', false), playerSlice('bird:closed', 'bird', false), playerSlice('robot:open', 'robot', true), playerSlice('bird:open', 'bird', true));
const modelCount = () => window.AshfallModels?.registry?.length || 0;
for (let i = 0; i < 5; i++) {
  slices.push({ name: 'robot-model:' + i, run() {
    const M = window.AshfallModels; if (!M?.compose || i >= modelCount()) return; M.ensure?.();
    const rig = M.compose(M.selection({ model: String(i) })), g = rig.group; g.position.set(0, 0, 0); scene.add(g);
    try { withWorldMode(() => { g.visible = true }, drawOnce) } finally { scene.remove(g); g.traverse(o => o.geometry?.dispose?.()) }
  } });
  slices.push({ name: 'chicken-model:' + i, run() {
    const C = window.AshfallChickenModels; if (!C?.apply || i >= (C.count || 0)) return; const holder = new T.Group(); scene.add(holder);
    try { C.apply(holder, { model: String(i) }, 'prewarm' + i); withWorldMode(() => { holder.visible = true }, drawOnce) } finally { scene.remove(holder); holder.traverse(o => o.geometry?.dispose?.()) }
  } });
}

// ---- scheduler: one slice per tick, spaced out while the menu idles, back-to-back once the player has clicked ----------------------------------------------------------------------
let index = 0, nextAt = performance.now() + 2500, rush = false;
function tick(now) {
  if (index >= slices.length) { if (!stats.ready) { stats.ready = true; stats.total = +stats.log.reduce((a, b) => a + b.ms, 0).toFixed(1); console.info('[prewarm] world ready in ' + stats.log.length + ' steps, ' + stats.total + ' ms of work', stats.log.map(l => l.name + ' ' + l.ms).join(' | ')) } return }
  if (!CM.active) return;                                  // only warm while the menu owns the scene (in the lobby menu this still matters: parts of the world are outside the menu camera's view)                                  // only warm while the menu owns the scene; nothing to do once the world is live
  if (now < nextAt && !rush) return;
  const s = slices[index++], t0 = performance.now();
  try { s.run() } catch (e) { console.warn('[prewarm] ' + s.name + ' skipped:', e) }
  stats.log.push({ name: s.name, ms: +(performance.now() - t0).toFixed(1) });
  nextAt = performance.now() + (rush ? 0 : 450);
}
const orig = MM.update;
MM.update = function (dt, t) { tick(performance.now()); return orig.call(this, dt, t) };
window.AshfallPrewarm = { stats, get ready() { return stats.ready }, get remaining() { return slices.length - index }, rush() { rush = true } };
// clicking the sign: finish whatever is left right away (the gate animation hides it)
window.addEventListener('ashfall-gate-start', () => { rush = true });
})();
