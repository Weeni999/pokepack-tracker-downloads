/* SOFT LIGHT: replaces the hard see-through cone meshes (floodlight cones, rave moving-head beams, stage beams, floor cones) with soft light.
   - CONES: every open cone mesh used as a fake beam is found by shape (ConeGeometry + transparent, no depth write). Per group (floodlights / rave beams) you choose OFF (moved to a hidden layer and its
     GPU geometry released), SOFT (a gradient material whose edges and ends fade out, so there is no rim or hard silhouette) or ORIGINAL (the old hard cone).
   - FLOOR POOLS: every floodlight throws a coloured pool of light on the floor under it (additive radial gradient that follows the light's current colour and brightness), so the greens, reds and ambers
     bleed onto the concrete.
   - SPOTLIGHT: the big centre floodlight is a real SpotLight (wide angle, full penumbra, soft decay) pointing at the ring instead of an omni point light.
   - DUST: a light drift of dust motes in the air catches the glow; the room's exponential fog already provides the haze (fog density: dev menu > GRAPHICS).
   No hard geometry is added; the only new scene light is the one SpotLight swapped in for a PointLight. Controls: dev menu (9) > LIGHT. */
(() => {
'use strict';
const T = window.THREE, hub = window.AshfallHubScene, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu, Y = window.AshfallYardDressing;
if (!T || !hub?.scene || !W?.yard || !MM || typeof MM.update !== 'function' || !Y?.floodLights) return;
const yard = W.yard, scene = hub.scene, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), HIDDEN = 5;
const cfg = { floodCones: 'off', beamCones: 'soft', softGain: 1.6, pools: true, poolStrength: 1, poolSize: 1, dust: true, dustAmount: 1, dustSize: .07 };

// ---- soft cone material: fades at the silhouette and at both ends, exposes .color and .opacity like a basic material so the existing light code keeps working ---------------------------------------
function softMaterial(orig) {
  const m = new T.ShaderMaterial({
    uniforms: { uColor: { value: orig.color.clone() }, uOpacity: { value: orig.opacity }, uGain: { value: cfg.softGain } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; uniform float uGain; varying vec3 vN; varying vec3 vV; varying float vY; void main() { float f = abs(dot(normalize(vN), normalize(vV))); float edge = pow(f, 2.6); float ends = smoothstep(0.0, .18, vY) * (1.0 - smoothstep(.82, 1.0, vY)) * .6 + .4 * (1.0 - vY); gl_FragColor = vec4(uColor, uOpacity * uGain * edge * ends); }',
    transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false
  });
  Object.defineProperty(m, 'color', { get() { return this.uniforms.uColor.value } });
  Object.defineProperty(m, 'opacity', { get() { return this.uniforms.uOpacity.value }, set(v) { this.uniforms.uOpacity.value = v } });
  return m;
}
const meshes = new Set();
function isCone(o) { return o.isMesh && o.geometry?.type === 'ConeGeometry' && o.material && !Array.isArray(o.material) && o.material.transparent && o.material.depthWrite === false && !o.userData.softIgnore }
function groupOf(o) { return o.parent === Y.group ? 'flood' : 'beam' }
function apply(o) {
  const mode = groupOf(o) === 'flood' ? cfg.floodCones : cfg.beamCones, u = o.userData; if (!u.softOrig) u.softOrig = o.material;
  if (mode === 'off') { if (o.layers.mask !== (1 << HIDDEN)) { o.layers.set(HIDDEN); if (!u.softFreed) { u.softFreed = true; o.geometry.dispose() } } return }
  o.layers.set(0); u.softFreed = false;
  if (mode === 'soft') { if (!u.softMat) u.softMat = softMaterial(u.softOrig); if (o.material !== u.softMat) { u.softMat.uniforms.uColor.value.copy(o.material.color || u.softOrig.color); u.softMat.uniforms.uOpacity.value = o.material.opacity ?? .1; o.material = u.softMat } u.softMat.uniforms.uGain.value = cfg.softGain }
  else if (o.material !== u.softOrig) { u.softOrig.color.copy(o.material.color); u.softOrig.opacity = o.material.opacity; o.material = u.softOrig }
}
let lastScan = 0, lastKey = '';
function scan(now) {
  const key = cfg.floodCones + cfg.beamCones + cfg.softGain; if (now - lastScan < 1.2 && key === lastKey) return; lastScan = now; lastKey = key;
  scene.traverse(o => { if (isCone(o) || o.userData.softOrig) { meshes.add(o); apply(o) } });
}

// ---- the centre floodlight becomes a real, wide, soft SpotLight ---------------------------------------------------------------------------------------------------------------------------------------------------
(function spot() {
  const f = Y.floodLights[0]; if (!f || f.light.isSpotLight) return; const old = f.light, s = new T.SpotLight(old.color, old.intensity, 80, 1.2, 1, 1.5);
  s.position.copy(old.position); s.target.position.set(old.position.x, 0, old.position.z); old.parent.add(s, s.target); old.parent.remove(old); f.light = s;
})();
// ---- floor pools of coloured light --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.35, 'rgba(255,255,255,.4)'); gr.addColorStop(.7, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c) })();
const pools = Y.floodLights.map(f => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: poolTex, color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(f.light.position.x, .05, f.light.position.z); m.renderOrder = 2; m.userData.softIgnore = true; Y.group.add(m); return { m, f, size: f.light.position.y > 20 ? 20 : 11, base0: f.base } });
// ---- dust motes ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ND = 360, dp = new Float32Array(ND * 3), dv = new Float32Array(ND * 3), dgeo = new T.BufferGeometry();
for (let i = 0; i < ND; i++) { dp[i * 3] = (Math.random() - .5) * 42; dp[i * 3 + 1] = 1 + Math.random() * 18; dp[i * 3 + 2] = -78 + Math.random() * 38; dv[i * 3] = (Math.random() - .5) * .18; dv[i * 3 + 1] = (Math.random() - .5) * .08; dv[i * 3 + 2] = (Math.random() - .5) * .18 }
dgeo.setAttribute('position', new T.BufferAttribute(dp, 3)); dgeo.boundingSphere = new T.Sphere(new T.Vector3(0, 10, -60), 60);
const dust = new T.Points(dgeo, new T.PointsMaterial({ size: cfg.dustSize, map: poolTex, color: 0xffe8c0, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true })); dust.frustumCulled = false; dust.renderOrder = 3; dust.userData.softIgnore = true; yard.add(dust);

let last = performance.now() / 1000;
const orig = MM.update;
MM.update = function (dt, t) {
  const now = performance.now() / 1000, d = Math.min(.1, now - last); last = now;
  if (W.root.visible && yard.visible) {
    try {
      scan(now);
      for (const p of pools) { const L = p.f.light, on = cfg.pools, k = on ? clamp(L.intensity / Math.max(1, p.base0), 0, 1.6) : 0; p.m.visible = on; if (on) { p.m.material.color.copy(L.color); p.m.material.opacity = clamp(.34 * cfg.poolStrength * k, 0, .9); p.m.scale.setScalar(p.size * cfg.poolSize) } }
      dust.visible = cfg.dust; if (cfg.dust) { dust.material.size = cfg.dustSize; dust.material.opacity = clamp(.5 * cfg.dustAmount, 0, 1); for (let i = 0; i < ND; i++) { dp[i * 3] += dv[i * 3] * d; dp[i * 3 + 1] += dv[i * 3 + 1] * d; dp[i * 3 + 2] += dv[i * 3 + 2] * d; if (dp[i * 3] > 21) dp[i * 3] = -21; else if (dp[i * 3] < -21) dp[i * 3] = 21; if (dp[i * 3 + 1] > 19) dp[i * 3 + 1] = 1; else if (dp[i * 3 + 1] < 1) dp[i * 3 + 1] = 19; if (dp[i * 3 + 2] > -40) dp[i * 3 + 2] = -78; else if (dp[i * 3 + 2] < -78) dp[i * 3 + 2] = -40 } dgeo.attributes.position.needsUpdate = true }
    } catch (e) { if (!MM.update.w) { MM.update.w = true; console.warn('[soft-light]', e) } }
  }
  return orig.call(this, dt, t);
};
window.AshfallSoftLight = { cfg, rescan() { lastScan = 0 }, get cones() { return meshes.size } };
})();
