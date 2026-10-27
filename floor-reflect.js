/* FLOOR REFLECT: wet-concrete reflections on the lobby floor. WebGL has no hardware ray tracing, so this is the closest real-time equivalent: the scene is rendered once more from a mirrored camera
   (planar reflection, the way three.js's Reflector works) into a small render target, and a thin shader plane lying on the floor shows it: blurred, rippled, strongest at grazing angles (Fresnel)
   and strongest inside noisy puddle patches, with a faint sheen across the dry floor. Neon signs, rave beams, the stage screen and the crowd all show up in the floor.
   COST CONTROL: the mirror pass renders at a fraction of the screen resolution (default 40%), at a capped rate (default 24 per second), skips shadow updates, and switches itself off when the lobby
   is not on screen; the adaptive governor in perf-fx.js lowers its quality or turns it off first when the frame rate drops. Controls: dev menu (9) > REFLECTIONS. */
(() => {
'use strict';
const T = window.THREE, hub = window.AshfallHubScene, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu;
if (!T || !hub?.scene || !W?.yard || !MM || typeof MM.update !== 'function') return;
const yard = W.yard, scene = hub.scene, r = hub.renderer, camera = hub.camera;
const cfg = { enabled: true, strength: .85, puddles: .5, sheen: .12, blur: 1.2, ripples: true, resScale: .4, rate: 24 };
const PLANE_Y = .03;
// ---- the floor plane + shader ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const uniforms = { tRef: { value: null }, textureMatrix: { value: new T.Matrix4() }, uStrength: { value: cfg.strength }, uPuddles: { value: cfg.puddles }, uSheen: { value: cfg.sheen }, uBlur: { value: cfg.blur }, uRipple: { value: 1 }, uTime: { value: 0 }, uTexel: { value: new T.Vector2(1 / 256, 1 / 256) } };
const mat = new T.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  vertexShader: 'uniform mat4 textureMatrix; varying vec4 vProj; varying vec3 vWorld; void main() { vProj = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform sampler2D tRef; uniform float uStrength; uniform float uPuddles; uniform float uSheen; uniform float uBlur; uniform float uRipple; uniform float uTime; uniform vec2 uTexel; varying vec4 vProj; varying vec3 vWorld;
    float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      float n = vn(vWorld.xz * .22) * .6 + vn(vWorld.xz * .7 + 7.0) * .3 + vn(vWorld.xz * 2.1) * .1;
      float puddle = smoothstep(1.0 - uPuddles - .05, 1.0 - uPuddles + .18, n) * step(.001, uPuddles);
      vec2 rip = uRipple > .5 ? vec2(vn(vWorld.xz * 3.0 + uTime * .5), vn(vWorld.xz * 3.0 - uTime * .45 + 9.0)) - .5 : vec2(0.0);
      vec2 uv = vProj.xy / vProj.w + rip * .012 * (.3 + puddle);
      float b = uBlur * (1.0 + (1.0 - puddle) * 1.6);
      vec3 c = texture2D(tRef, uv).rgb * .28;
      for (int i = 0; i < 8; i++) { float a = float(i) * .7854; vec2 o = vec2(cos(a), sin(a)) * uTexel * b * 2.0; c += texture2D(tRef, uv + o).rgb * .09; }
      vec3 V = normalize(cameraPosition - vWorld); float fr = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0) * .75 + .25;
      float amount = clamp(uStrength * (uSheen + puddle) * fr, 0.0, 1.0);
      gl_FragColor = vec4(c, amount);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const floor = new T.Mesh(new T.PlaneGeometry(46, 43), mat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, PLANE_Y, -59.5); floor.renderOrder = 1; floor.userData.noMerge = true; floor.userData.softIgnore = true; floor.frustumCulled = false; floor.matrixAutoUpdate = true; yard.add(floor);

// ---- the mirror pass ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const mirror = new T.PerspectiveCamera(), rt = new T.WebGLRenderTarget(256, 256, { type: T.HalfFloatType, depthBuffer: true, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
const normal = new T.Vector3(0, 1, 0), rPos = new T.Vector3(), cPos = new T.Vector3(), view = new T.Vector3(), lookAt = new T.Vector3(), tgt = new T.Vector3(), rot = new T.Matrix4(), size = new T.Vector2();
let acc = 0, last = performance.now() / 1000, lastBuilt = 0;
function pass() {
  r.getDrawingBufferSize(size); const w = Math.max(64, Math.round(size.x * cfg.resScale)), h = Math.max(64, Math.round(size.y * cfg.resScale)); if (rt.width !== w || rt.height !== h) { rt.setSize(w, h); uniforms.uTexel.value.set(1 / w, 1 / h) }
  floor.updateMatrixWorld(true); camera.updateMatrixWorld(true); rPos.setFromMatrixPosition(floor.matrixWorld); cPos.setFromMatrixPosition(camera.matrixWorld); rot.extractRotation(camera.matrixWorld);
  view.subVectors(rPos, cPos).reflect(normal).negate().add(rPos); lookAt.set(0, 0, -1).applyMatrix4(rot).add(cPos); tgt.subVectors(rPos, lookAt).reflect(normal).negate().add(rPos);
  mirror.position.copy(view); mirror.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal); mirror.lookAt(tgt); mirror.far = camera.far; mirror.near = camera.near; mirror.updateMatrixWorld(); mirror.projectionMatrix.copy(camera.projectionMatrix); mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  uniforms.textureMatrix.value.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse).multiply(floor.matrixWorld);
  const oldTarget = r.getRenderTarget(), oldShadow = r.shadowMap.autoUpdate, oldAuto = r.autoClear, bg = scene.background;
  floor.visible = false; r.shadowMap.autoUpdate = false; r.autoClear = true; r.setRenderTarget(rt);
  try { r.render(scene, mirror) } finally { r.setRenderTarget(oldTarget); r.shadowMap.autoUpdate = oldShadow; r.autoClear = oldAuto; floor.visible = true; scene.background = bg }
  uniforms.tRef.value = rt.texture;
}
const orig = MM.update;
MM.update = function (dt, t) {
  const now = performance.now() / 1000, d = Math.min(.1, now - last); last = now;
  const on = cfg.enabled && W.root.visible && yard.visible && cfg.strength > 0; floor.visible = on && !!uniforms.tRef.value;
  if (on) {
    uniforms.uStrength.value = cfg.strength; uniforms.uPuddles.value = cfg.puddles; uniforms.uSheen.value = cfg.sheen; uniforms.uBlur.value = cfg.blur; uniforms.uRipple.value = cfg.ripples ? 1 : 0; uniforms.uTime.value = now;
    acc += d; if (acc >= 1 / Math.max(2, cfg.rate)) { acc = 0; try { pass(); lastBuilt = now } catch (e) { if (!pass.w) { pass.w = true; console.warn('[floor-reflect]', e) } } }
    if (!uniforms.tRef.value) floor.visible = false;
  }
  return orig.call(this, dt, t);
};
window.AshfallFloorReflect = { cfg, get target() { return rt }, mesh: floor, get lastBuilt() { return lastBuilt } };
})();
