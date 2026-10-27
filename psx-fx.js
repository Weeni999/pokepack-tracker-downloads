/* PSX FX: an optional PlayStation-1 look for the whole 3D view. Everything is off until you switch "PSX look" on in the dev menu (9) > PSX tab, and every part can be toggled or tuned there.
   1. VERTEX SNAPPING (the PS1 wobble): every vertex is snapped to a virtual pixel grid right after projection (materials get a small onBeforeCompile patch; the first time you enable the look,
      the scene's materials recompile once, which can cause a short hitch). Jitter intensity 0..2 sets how coarse the grid is.
   2. AFFINE TEXTURE MAPPING: UVs are interpolated in screen space (no perspective divide) so textures swim and warp. Separate switches for characters and for the world / props.
   3. LOW-RES FRAMEBUFFER: the main view is rendered to a small render target (e.g. 320x240) with point filtering and blown up with no smoothing.
   4. COLOUR DEPTH + DITHER: a post pass crushes colour to N bits per channel (5 = PS1 15-bit) with an ordered 2x2 / 4x4 Bayer dither.
   5. FRAME-RATE CAP: the 3D canvas redraws at 15-30 fps while the HTML interface keeps running at full speed.
   Only the main scene draw is touched; shadow / depth / fight-display render targets and screenshots of other cameras are left alone. */
(() => {
'use strict';
const T = window.THREE, hub = window.AshfallHubScene;
if (!T || !hub?.renderer || !hub.scene || !hub.camera) return;
const r = hub.renderer, scene = hub.scene, camera = hub.camera, origRender = r.render.bind(r);
const cfg = {
  enabled: false,
  vertexSnap: true, jitter: 1, snapCharacters: true, snapWorld: true,
  affine: true, affineAmount: 1, affineCharacters: true, affineWorld: true,
  lowRes: true, height: 240, aspect: 'screen',
  banding: true, bits: 5,
  dither: true, ditherStrength: 1, ditherSize: 4,
  overlay: true,
  capFps: false, fps: 20
};
const fx = { master: false, crt: true, curvature: .12, zoom: 1, edgeMask: true, scanlines: true, scanStrength: .3, scanSize: 1, chroma: true, chromaAmount: .004, bloom: true, bloomStrength: .7, bloomThreshold: .8, bloomRadius: 1, grain: true, grainAmount: .07, vignette: true, vignetteAmount: .45 };
// shared uniforms: flipping a toggle is a value change, never a recompile
const U = { grid: { value: new T.Vector2(320, 240) }, snap: { value: 0 }, aff: { value: 0 }, snapChar: { value: 1 }, snapWorld: { value: 1 }, affChar: { value: 1 }, affWorld: { value: 1 } };
const wrapped = new Set(); const OVERLAY = 6, flagged = [], U2 = { nf: { value: new T.Vector2(.1, 150) }, depth: { value: null }, res: { value: new T.Vector2(1, 1) }, on: { value: 0 } }; let overlayOn = false;
let wrappedAny = false, lastScan = 0, rt = null, quad = null, quadScene = null, quadCam = null, lastDraw = 0, rtW = 0, rtH = 0;

// ---- material patch ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const OK = m => m && !m.userData?.psxSkip && (m.isMeshStandardMaterial || m.isMeshBasicMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial) && !m.userData?.psxSkip;
const isCharacter = m => !!(m.userData && (m.userData.colorRole || m.userData.region || m.userData.eye));
function wrap(m) {
  if (!OK(m) || wrapped.has(m)) return; wrapped.add(m);
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey, ch = isCharacter(m), snapU = ch ? U.snapChar : U.snapWorld, affU = ch ? U.affChar : U.affWorld;
  m.onBeforeCompile = function (sh, rend) {
    if (prev) prev.call(this, sh, rend);
    sh.uniforms.uPsxGrid = U.grid; sh.uniforms.uPsxSnap = U.snap; sh.uniforms.uPsxAff = U.aff; sh.uniforms.uPsxMatSnap = snapU; sh.uniforms.uPsxMatAff = affU;
    const decl = 'uniform vec2 uPsxGrid; uniform float uPsxSnap; uniform float uPsxAff; uniform float uPsxMatSnap; uniform float uPsxMatAff;\n';
    if (sh.vertexShader.includes('#include <project_vertex>')) {
      sh.vertexShader = decl + '#ifdef USE_MAP\nvarying vec2 vPsxUv; varying float vPsxW;\n#endif\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        if (uPsxSnap * uPsxMatSnap > .5 && gl_Position.w > 0.0) { vec3 psxN = gl_Position.xyz / gl_Position.w; psxN.xy = floor(psxN.xy * uPsxGrid * .5 + .5) / (uPsxGrid * .5); gl_Position.xyz = psxN * gl_Position.w; }
        #ifdef USE_MAP
        vPsxUv = vMapUv * gl_Position.w; vPsxW = gl_Position.w;
        #endif`);
      if (sh.fragmentShader.includes('#include <map_fragment>')) sh.fragmentShader = decl + '#ifdef USE_MAP\nvarying vec2 vPsxUv; varying float vPsxW;\n#endif\n' + sh.fragmentShader.replace('#include <map_fragment>', T.ShaderChunk.map_fragment.replace(/vMapUv/g, 'psxUv').replace('#ifdef USE_MAP', '#ifdef USE_MAP\n\tvec2 psxUv = mix(vMapUv, vPsxUv / max(vPsxW, 1e-4), uPsxAff * uPsxMatAff);'));
    }
  };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|psx' };
  m.needsUpdate = true;
}
// Self-lit display surfaces (MeshBasicMaterial meshes) inside anything flagged userData.ignorePsx (neon letters, betting board, monitors, LED screens) are drawn in a second pass straight to the screen, after the low-res picture, so they stay crisp.
// Their materials get a depth test against the low-res scene depth, so walls and pillars still hide them.
function prepFlagged() {
  flagged.length = 0;
  scene.traverse(o => { if (!o.userData?.ignorePsx) return; o.traverse(c => { if (!c.isMesh || !c.material || Array.isArray(c.material) || !c.material.isMeshBasicMaterial) return; flagged.push(c); for (const m of (Array.isArray(c.material) ? c.material : [c.material])) { if (!m || m.userData.psxOv) continue; m.userData.psxOv = true; m.userData.psxSkip = true; patchOverlay(m) } }) });
}
function patchOverlay(m) {
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, rend) { if (prev) prev.call(this, sh, rend); sh.uniforms.uPsxDepth = U2.depth; sh.uniforms.uPsxOvRes = U2.res; sh.uniforms.uPsxOvOn = U2.on; sh.uniforms.uPsxNF = U2.nf; sh.fragmentShader = 'uniform sampler2D uPsxDepth; uniform vec2 uPsxOvRes; uniform float uPsxOvOn; uniform vec2 uPsxNF; float psxLin(float z) { return 2.0 * uPsxNF.x * uPsxNF.y / (uPsxNF.y + uPsxNF.x - (2.0 * z - 1.0) * (uPsxNF.y - uPsxNF.x)); }\n' + sh.fragmentShader.replace('void main() {', 'void main() { if (uPsxOvOn > .5) { float sd = texture2D(uPsxDepth, gl_FragCoord.xy / uPsxOvRes).x; if (sd < .9999 && psxLin(gl_FragCoord.z) > psxLin(sd) * 1.03 + .6) discard; }') };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|psxov' }; m.needsUpdate = true;
}
function setOverlayLayers(on) { if (on === overlayOn) return; overlayOn = on; for (const c of flagged) { if (on) c.layers.set(OVERLAY); else c.layers.set(0) } }
function scan() { prepFlagged(); if (overlayOn) for (const c of flagged) c.layers.set(OVERLAY); scene.traverse(o => { const mat = o.material; if (!mat || o.isPoints || o.isSprite || o.isLine) return; if (Array.isArray(mat)) mat.forEach(wrap); else wrap(mat) }); wrappedAny = true }

// ---- post pass ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function fsMat(frag, uniforms) { return new T.ShaderMaterial({ uniforms, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false }) }
let brightMat = null, blurMat = null, bA = null, bB = null, bC = null, bD = null, bw = 0, bh = 0, fsQuad = null, fsScene = null;
function fsRender(mat, target) { fsQuad.material = mat; r.setRenderTarget(target); r.autoClear = true; origRender(fsScene, quadCam) }
function post() {
  if (quad) return;
  quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); quadScene = new T.Scene();
  quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, uRes: { value: new T.Vector2(320, 240) }, uLevels: { value: 31 }, uBand: { value: 1 }, uDither: { value: 1 }, uMat: { value: 4 },
      uCurve: { value: 0 }, uZoom: { value: 1 }, uEdgeMask: { value: 1 }, uChroma: { value: 0 }, uBloom: { value: 0 }, uScan: { value: 0 }, uScanFreq: { value: 1 }, uGrain: { value: 0 }, uVig: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tBloom; uniform vec2 uRes; uniform float uLevels; uniform float uBand; uniform float uDither; uniform float uMat;
      uniform float uCurve; uniform float uZoom; uniform float uEdgeMask; uniform float uChroma; uniform float uBloom; uniform float uScan; uniform float uScanFreq; uniform float uGrain; uniform float uVig; uniform float uTime; varying vec2 vUv;
      const float B4[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
      const float B2[4] = float[4](0., 2., 3., 1.);
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = (vUv - .5) / max(uZoom, .1) + .5, c = uv * 2.0 - 1.0;
        if (uCurve > 0.0) { c += c * dot(c.yx, c.yx) * uCurve; uv = c * .5 + .5; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { if (uEdgeMask > .5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; } uv = clamp(uv, 0.0, 1.0); } }
        vec2 dir = uv - .5; float r2 = dot(dir, dir); vec3 col;
        if (uChroma > 0.0) { vec2 o = dir * r2 * uChroma * 12.0; col = vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b); } else col = texture2D(tDiffuse, uv).rgb;
        if (uBloom > 0.0) col += texture2D(tBloom, uv).rgb * uBloom;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 o = gl_FragColor.rgb; ivec2 p = ivec2(floor(uv * uRes)); float t;
        if (uMat > 3.0) t = (B4[(p.y & 3) * 4 + (p.x & 3)] + .5) / 16.0 - .5; else t = (B2[(p.y & 1) * 2 + (p.x & 1)] + .5) / 4.0 - .5;
        o += t * uDither / uLevels;
        if (uBand > .5) o = floor(o * uLevels + .5) / uLevels;
        if (uScan > 0.0) o *= 1.0 - uScan * (.5 + .5 * sin(gl_FragCoord.y * 3.14159265 * uScanFreq));
        if (uGrain > 0.0) o += (hash(gl_FragCoord.xy + fract(uTime) * 311.0) - .5) * uGrain;
        if (uVig > 0.0) o *= 1.0 - uVig * smoothstep(.25, .78, length(dir) * 1.45);
        gl_FragColor = vec4(clamp(o, 0.0, 1.0), 1.0);
      }`, depthTest: false, depthWrite: false
  })); quad.frustumCulled = false; quadScene.add(quad);
  fsScene = new T.Scene(); fsQuad = new T.Mesh(new T.PlaneGeometry(2, 2), quad.material); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
  brightMat = fsMat('uniform sampler2D tSrc; uniform float uThr; varying vec2 vUv; void main() { vec3 c = texture2D(tSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(uThr, uThr + .5, l); gl_FragColor = vec4(c * k, 1.0); }', { tSrc: { value: null }, uThr: { value: .8 } });
  blurMat = fsMat('uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main() { vec3 s = texture2D(tSrc, vUv).rgb * .227027; vec2 d1 = uDir * 1.3846, d2 = uDir * 3.2308; s += (texture2D(tSrc, vUv + d1).rgb + texture2D(tSrc, vUv - d1).rgb) * .3162162; s += (texture2D(tSrc, vUv + d2).rgb + texture2D(tSrc, vUv - d2).rgb) * .0702703; gl_FragColor = vec4(s, 1.0); }', { tSrc: { value: null }, uDir: { value: new T.Vector2() } });
}
function ensureRT(cw, ch) {
  const low = cfg.enabled && cfg.lowRes, h = Math.round(clamp(low ? cfg.height : ch, 64, 2160)), w = Math.round(cfg.aspect === '4:3' ? h * 4 / 3 : low ? h * (cw / Math.max(1, ch)) : cw);
  const W = low ? w : cw, H = low ? h : ch;
  if (rt && rtW === W && rtH === H) return; rtW = W; rtH = H;
  if (rt) { rt.depthTexture?.dispose(); rt.dispose() } const dt = new T.DepthTexture(W, H); dt.minFilter = dt.magFilter = T.NearestFilter; rt = new T.WebGLRenderTarget(W, H, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, type: T.HalfFloatType, depthBuffer: true, depthTexture: dt, generateMipmaps: false }); rt.texture.minFilter = rt.texture.magFilter = T.NearestFilter;
}
function ensureBloom() {
  const w = Math.max(32, Math.round(rtW / 4)), h = Math.max(24, Math.round(rtH / 4)); if (bA && bw === w && bh === h) return; bw = w; bh = h; for (const t of [bA, bB, bC, bD]) t?.dispose();
  const mk = (W, H) => new T.WebGLRenderTarget(W, H, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, type: T.HalfFloatType, depthBuffer: false });
  bA = mk(w, h); bB = mk(w, h); bC = mk(Math.max(16, w >> 1), Math.max(12, h >> 1)); bD = mk(Math.max(16, w >> 1), Math.max(12, h >> 1));
}
// selective bloom: only what is brighter than the threshold (neon, glowing eyes, lasers, flashes) is blurred at two scales and added back before tone mapping
function bloomPass() {
  ensureBloom(); brightMat.uniforms.tSrc.value = rt.texture; brightMat.uniforms.uThr.value = fx.bloomThreshold; fsRender(brightMat, bA);
  const rad = fx.bloomRadius;
  blurMat.uniforms.tSrc.value = bA.texture; blurMat.uniforms.uDir.value.set(rad / bA.width, 0); fsRender(blurMat, bB); blurMat.uniforms.tSrc.value = bB.texture; blurMat.uniforms.uDir.value.set(0, rad / bA.height); fsRender(blurMat, bA);
  blurMat.uniforms.tSrc.value = bA.texture; blurMat.uniforms.uDir.value.set(rad / bC.width, 0); fsRender(blurMat, bC); blurMat.uniforms.tSrc.value = bC.texture; blurMat.uniforms.uDir.value.set(0, rad / bC.height); fsRender(blurMat, bD);
  blurMat.uniforms.tSrc.value = bD.texture; blurMat.uniforms.uDir.value.set(rad / bC.width, 0); fsRender(blurMat, bC); blurMat.uniforms.tSrc.value = bC.texture; blurMat.uniforms.uDir.value.set(0, rad / bC.height); fsRender(blurMat, bD);
  bloomTex.value = bD.texture;
}
const bloomTex = { value: null };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function syncUniforms(cw, ch) {
  const on = cfg.enabled;
  U.snap.value = on && cfg.vertexSnap ? 1 : 0; U.aff.value = on && cfg.affine ? cfg.affineAmount : 0;
  U.snapChar.value = cfg.snapCharacters ? 1 : 0; U.snapWorld.value = cfg.snapWorld ? 1 : 0; U.affChar.value = cfg.affineCharacters ? 1 : 0; U.affWorld.value = cfg.affineWorld ? 1 : 0;
  const j = clamp(cfg.jitter, 0, 2), baseW = cfg.lowRes ? rtW || 320 : cw, baseH = cfg.lowRes ? rtH || 240 : ch, f = (j <= 1 ? 8 - 7 * j : 1 / j);
  U.grid.value.set(Math.max(8, baseW * f), Math.max(8, baseH * f));
}
r.render = function (sc, cam) {
  const psxOn = cfg.enabled, fxOn = fx.master;
  if (sc !== scene || cam !== camera || r.getRenderTarget() !== null || (!psxOn && !fxOn)) { if (!psxOn && wrappedAny) { U.snap.value = 0; U.aff.value = 0; setOverlayLayers(false) } return origRender(sc, cam) }
  const now = performance.now();
  if (psxOn) { if (!wrappedAny || now - lastScan > 1500) { scan(); lastScan = now } if (cfg.capFps && now - lastDraw < 1000 / clamp(cfg.fps, 5, 60) - 2) return; lastDraw = now }
  else if (wrappedAny) { U.snap.value = 0; U.aff.value = 0 }
  const size = r.getSize(new T.Vector2()), cw = Math.max(1, Math.round(size.x * r.getPixelRatio())), ch = Math.max(1, Math.round(size.y * r.getPixelRatio()));
  const psxPost = psxOn && (cfg.lowRes || cfg.banding || cfg.dither), needPost = psxPost || fxOn;
  setOverlayLayers(psxOn && psxPost && cfg.overlay);
  if (!needPost) { syncUniforms(cw, ch); return origRender(sc, cam) }
  post(); ensureRT(cw, ch); if (psxOn) syncUniforms(cw, ch);
  const u = quad.material.uniforms, bandOn = psxOn && cfg.banding, ditOn = psxOn && cfg.dither;
  u.tDiffuse.value = rt.texture; u.uRes.value.set(rtW, rtH); u.uLevels.value = bandOn ? Math.pow(2, clamp(Math.round(cfg.bits), 1, 8)) - 1 : 255; u.uBand.value = bandOn ? 1 : 0; u.uDither.value = ditOn ? cfg.ditherStrength : 0; u.uMat.value = cfg.ditherSize >= 4 ? 4 : 2;
  u.uCurve.value = fxOn && fx.crt ? fx.curvature : 0; u.uZoom.value = clamp(fx.zoom ?? 1, 1, 1.6); u.uEdgeMask.value = fx.edgeMask ? 1 : 0; u.uChroma.value = fxOn && fx.chroma ? fx.chromaAmount : 0; u.uScan.value = fxOn && fx.scanlines ? fx.scanStrength : 0; u.uScanFreq.value = fx.scanSize > 0 ? 1 / fx.scanSize : 1;
  u.uGrain.value = fxOn && fx.grain ? fx.grainAmount : 0; u.uVig.value = fxOn && fx.vignette ? fx.vignetteAmount : 0; u.uTime.value = now / 1000;
  const keep = r.autoClear; r.setRenderTarget(rt); origRender(sc, cam);
  const bloomOn = fxOn && fx.bloom && fx.bloomStrength > 0; if (bloomOn) { bloomPass(); u.tBloom.value = bloomTex.value; u.uBloom.value = fx.bloomStrength } else u.uBloom.value = 0;
  r.setRenderTarget(null); r.autoClear = true; quadScene.children[0].material = quad.material; origRender(quadScene, quadCam);
  if (overlayOn && flagged.length) { const bg = sc.background, mask = cam.layers.mask; U2.depth.value = rt.depthTexture; U2.res.value.set(cw, ch); U2.nf.value.set(cam.near, cam.far); U2.on.value = 1; sc.background = null; cam.layers.set(OVERLAY); r.autoClear = false; r.clearDepth(); origRender(sc, cam); cam.layers.mask = mask; sc.background = bg; U2.on.value = 0 }
  r.autoClear = keep;
};
const PRESETS = {
  ps1: { lowRes: true, height: 240, aspect: '4:3', banding: true, bits: 5, dither: true, ditherStrength: 1, ditherSize: 4, vertexSnap: true, jitter: 1, affine: true, affineAmount: 1 },
  ps1wide: { lowRes: true, height: 240, aspect: 'screen', banding: true, bits: 5, dither: true, ditherStrength: 1, ditherSize: 4, vertexSnap: true, jitter: 1, affine: true, affineAmount: 1 },
  sat: { lowRes: true, height: 224, aspect: '4:3', banding: true, bits: 5, dither: true, ditherStrength: 1, ditherSize: 2, vertexSnap: true, jitter: .8, affine: true, affineAmount: .8 },
  crunch: { lowRes: true, height: 120, aspect: 'screen', banding: true, bits: 4, dither: true, ditherStrength: 1.3, ditherSize: 4, vertexSnap: true, jitter: 1.5, affine: true, affineAmount: 1 },
  soft: { lowRes: true, height: 480, aspect: 'screen', banding: true, bits: 6, dither: true, ditherStrength: .6, ditherSize: 4, vertexSnap: true, jitter: .4, affine: true, affineAmount: .5 }
};
window.AshfallPSX = { fx, cfg, PRESETS, preset(k) { Object.assign(cfg, PRESETS[k] || {}) }, get status() { return cfg.enabled ? `render ${rtW}x${rtH}  materials patched ${wrapped.size}` : 'off' }, rescan: scan };
})();
