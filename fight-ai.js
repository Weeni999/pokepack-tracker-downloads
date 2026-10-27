/* FIGHT AI: the two cybernetic chickens in the arena now really fight. Each runs its own combat state machine (CIRCLE -> APPROACH -> LIGHT PECK combo / HEAVY CLAW LUNGE / WING BLOCK -> RECOIL ->
   RETREAT) and reads the other one: they circle at striking distance, step in to trade blows, block when they see a heavy wind-up, stagger when hit and back off to reset.
   Strikes land on one exact frame of the attack (the "animation event"): that frame checks the distance, applies a directional hit reaction (the victim is knocked along the line of the blow,
   its body snaps back and rolls with the angle of impact), freezes both birds for a hit-stop (50 ms on a heavy blow), bursts glowing electric sparks, bouncing scrap metal, a flash and a
   few arcs out of the impact point, and plays a randomised metal grind + electric zap. The models are procedural, so the moves are body animation (lean, crouch, lunge, recoil) on top of
   the models' own walk / idle rigs. Controls: dev menu (9) > LOBBY FX > ARENA FIGHT. */
(() => {
'use strict';
const T = window.THREE, W = window.AshfallWorldLayout, MM = window.AshfallMainMenu, Y = window.AshfallYardDressing;
if (!T || !W?.yard || !MM || typeof MM.update !== 'function' || !Y?.fighters) return;
const yard = W.yard, PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
const cfg = { enabled: true, aggression: 1, heavyChance: .3, blockChance: .45, speed: 1, hitStopMs: 50, sparks: 1, scrap: 1, arcs: true, sound: true, volume: .7 };
const ARENA_R = 2.35, CIRCLE_D = 1.85, RANGE = 1.3;                                 // ring-local units (the ring group is scaled 1.5 in the world)

// ---- the two fighters -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const F = [];
function setup() {
  if (F.length || Y.fighters.length < 2) return F.length === 2;
  for (const [i, f] of Y.fighters.slice(0, 2).entries()) { f.h.rotation.order = 'YXZ'; F.push({ f, h: f.h, i, ring: f.h.parent, x: f.h.position.x, z: f.h.position.z, yaw: f.h.rotation.y, vx: 0, vz: 0, state: 'CIRCLE', t: 0, dur: 1, dir: i ? 1 : -1, cool: rnd(.3, 1.2), pitch: 0, roll: 0, crouch: 0, flinch: 0, flinchRoll: 0, hits: 0, struck: false, combo: 0, kind: '', heavy: false, blocked: 0, tilt: 0, lean: 0, stepOff: 0, last: { x: 0, z: 0 } }) }
  return true;
}
const other = f => F[1 - f.i];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function enter(f, state, dur, extra) { f.state = state; f.t = 0; f.dur = dur; f.struck = false; Object.assign(f, extra) }

// ---- decisions --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function decide(f) {
  const o = other(f), d = dist(f, o), threat = (o.state === 'LIGHT' || o.state === 'HEAVY') && o.t < o.dur * .5;
  if (threat && d < RANGE + .5 && Math.random() < cfg.blockChance) return enter(f, 'BLOCK', rnd(.55, 1), {});
  if (d > RANGE + .15) return enter(f, 'APPROACH', 1.2, {});
  const r = Math.random();
  if (r < cfg.heavyChance) enter(f, 'HEAVY', 1, { heavy: true, kind: 'HEAVY' });
  else if (r < cfg.heavyChance + .55) enter(f, 'LIGHT', .34, { heavy: false, combo: 1 + Math.floor(Math.random() * 3), kind: 'LIGHT' });
  else enter(f, 'RETREAT', rnd(.5, .9), {});
}
// ---- impact -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let stopUntil = 0;
function strike(a) {
  const v = other(a), d = dist(a, v); a.struck = true; if (d > RANGE + .2) return;                    // whiff: no contact
  const ax = (v.x - a.x) / (d || 1), az = (v.z - a.z) / (d || 1), heavy = a.heavy, blocked = v.state === 'BLOCK', power = heavy ? 1 : .45;
  const ix = lerp(a.x, v.x, .7), iz = lerp(a.z, v.z, .7);
  // directional hit reaction: knock along the blow, snap the body back, roll with the side of impact (cross product with where the victim faces)
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), side = fx * az - fz * ax, front = fx * ax + fz * az;
  const push = (blocked ? .25 : 1) * power * 3.4; v.vx += ax * push; v.vz += az * push;
  v.flinch = Math.max(v.flinch, (blocked ? .18 : 1) * power); v.flinchRoll = clamp(side * 1.1, -.9, .9) * (blocked ? .3 : 1) + (front < 0 ? .0 : 0);
  if (!blocked) { v.hits++; if (heavy) enter(v, 'RECOIL', .5, {}) }
  else { a.vx -= ax * 1.6; a.vz -= az * 1.6; a.flinch = Math.max(a.flinch, .35) }
  impactFX(ix, iz, ax, az, power, blocked); if (!blocked) window.AshfallEyeFX?.flash(v.h, 'hit', heavy ? 700 : 350); if (heavy) window.AshfallEyeFX?.flash(a.h, 'power', 450); stopUntil = performance.now() + (blocked ? cfg.hitStopMs * .6 : heavy ? cfg.hitStopMs : cfg.hitStopMs * .5);
  stats.hits++; stats.last = (heavy ? 'HEAVY' : 'LIGHT') + (blocked ? ' (blocked)' : '') + ' by ' + (a.i ? 'B' : 'A');
}
// ---- per-state motion --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function stepFighter(f, dt) {
  const o = other(f), dx = o.x - f.x, dz = o.z - f.z, d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d, tx = -nz, tz = nx, sp = cfg.speed;
  f.t += dt; f.cool -= dt; const u = clamp(f.t / f.dur, 0, 1);
  let mx = 0, mz = 0, pitch = 0, crouch = 0, yawOff = 0, roll = 0;
  switch (f.state) {
    case 'CIRCLE': { f.dir = f.dir || 1; if (f.t > f.dur) { f.dir *= Math.random() < .35 ? -1 : 1; f.t = 0; f.dur = rnd(.8, 1.8) }
      const e = (d - CIRCLE_D) * 1.6; mx = (tx * f.dir * 1.15 + nx * e) * sp; mz = (tz * f.dir * 1.15 + nz * e) * sp; pitch = .08;
      if (f.cool <= 0) { f.cool = rnd(.4, 1.6) / cfg.aggression; if (Math.random() < .8 * Math.min(1.4, cfg.aggression)) decide(f) } break }
    case 'APPROACH': { mx = nx * 2.3 * sp + tx * f.dir * .5; mz = nz * 2.3 * sp + tz * f.dir * .5; pitch = .12; if (d < RANGE) decide(f); else if (u >= 1) enter(f, 'CIRCLE', 1, {}); break }
    case 'LIGHT': {                                                                           // quick peck: lean back, snap forward, hit on the strike frame, recover
      const w = u < .35 ? u / .35 : 1, s = u >= .35 && u < .62 ? (u - .35) / .27 : u >= .62 ? 1 - (u - .62) / .38 : 0;
      pitch = u < .35 ? -.18 * w : lerp(-.18, .6, clamp(s * 1.4, 0, 1)) * (u < .62 ? 1 : (1 - (u - .62) / .38)); mx = nx * (u >= .35 && u < .62 ? 3.2 : 0) * sp; mz = nz * (u >= .35 && u < .62 ? 3.2 : 0) * sp;
      if (!f.struck && u >= .5) strike(f);
      if (u >= 1) { if (--f.combo > 0 && dist(f, o) < RANGE + .6 && o.state !== 'BLOCK') enter(f, 'LIGHT', .34, { combo: f.combo }); else { f.cool = rnd(.5, 1.2) / cfg.aggression; enter(f, Math.random() < .6 ? 'RETREAT' : 'CIRCLE', rnd(.5, .9), {}) } } break }
    case 'HEAVY': { if (f.t < dt * 1.5) window.AshfallEyeFX?.flash(f.h, 'power', 500);                                                                           // claw lunge: crouch and lean back, explode forward, hit, long recovery
      const wind = u < .38, lunge = u >= .38 && u < .58;
      pitch = wind ? -.5 * (u / .38) : lunge ? lerp(-.5, .75, (u - .38) / .2) : lerp(.75, 0, (u - .58) / .42); crouch = wind ? .12 * (u / .38) : lunge ? .12 - .1 * ((u - .38) / .2) : 0;
      mx = (wind ? -nx * .5 : lunge ? nx * 6.2 : 0) * sp; mz = (wind ? -nz * .5 : lunge ? nz * 6.2 : 0) * sp; roll = lunge ? .2 * f.dir : 0;
      if (!f.struck && u >= .56) strike(f);
      if (u >= 1) { f.cool = rnd(.8, 1.8) / cfg.aggression; enter(f, 'RETREAT', rnd(.6, 1), {}) } break }
    case 'BLOCK': { pitch = .22; crouch = .16; yawOff = .75 * f.dir; mx = -nx * .25; mz = -nz * .25; if (u >= 1) { f.cool = rnd(.2, .7); enter(f, Math.random() < .55 ? 'LIGHT' : 'CIRCLE', .34, { heavy: false, combo: 1 + Math.floor(Math.random() * 2), kind: 'LIGHT' }) } break }
    case 'RECOIL': { pitch = -.55 * (1 - u) ** 2; crouch = .2 * (1 - u); mx = 0; mz = 0; if (u >= 1) { f.cool = rnd(.2, .6); enter(f, Math.random() < .5 ? 'RETREAT' : 'BLOCK', rnd(.5, .8), {}) } break }
    case 'RETREAT': { mx = (-nx * 2.2 + tx * f.dir * .6) * sp; mz = (-nz * 2.2 + tz * f.dir * .6) * sp; pitch = .05; if (u >= 1 || d > CIRCLE_D + .5) enter(f, 'CIRCLE', 1, {}); break }
  }
  // knockback velocity from hits decays quickly; movement stays inside the cage
  f.vx *= Math.exp(-dt * 7); f.vz *= Math.exp(-dt * 7);
  f.x += (mx + f.vx) * dt; f.z += (mz + f.vz) * dt;
  const rr = Math.hypot(f.x, f.z); if (rr > ARENA_R) { f.x *= ARENA_R / rr; f.z *= ARENA_R / rr }
  const sep = dist(f, o); if (sep < .75) { f.x -= nx * (.75 - sep) * .5; f.z -= nz * (.75 - sep) * .5 }                                  // never overlap
  f.flinch *= Math.exp(-dt * 8); f.flinchRoll *= Math.exp(-dt * 6);
  const faceYaw = Math.atan2(dx, dz) + yawOff; let dy = faceYaw - f.yaw; dy = ((dy + PI) % (PI * 2) + PI * 2) % (PI * 2) - PI; f.yaw += dy * Math.min(1, dt * 12);
  f.pitch = lerp(f.pitch, pitch, Math.min(1, dt * 18)); f.crouch = lerp(f.crouch, crouch, Math.min(1, dt * 14)); f.roll = lerp(f.roll, roll, Math.min(1, dt * 10));
}
function apply(f, dt) {
  const h = f.h; h.position.x = f.x; h.position.z = f.z; h.position.y = f.f.base.y + (f.state === 'LIGHT' || f.state === 'HEAVY' ? Math.sin(clamp(f.t / f.dur, 0, 1) * PI) * .06 : 0);
  h.rotation.y = f.yaw; h.rotation.x = f.pitch - f.flinch * .55; h.rotation.z = f.roll + f.flinchRoll * f.flinch * .6; h.scale.y = .62 * (1 - f.crouch);
  window.AshfallChickenModels?.update?.(h, dt);
}

// ---- impact effects: sparks, scrap, flash, arcs ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
const NS = 320, sp = { pos: new Float32Array(NS * 3).fill(-50), vel: new Float32Array(NS * 3), col: new Float32Array(NS * 3), base: new Float32Array(NS * 3), age: new Float32Array(NS).fill(99), life: new Float32Array(NS).fill(1), k: 0 };
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c) })();
const sGeo = new T.BufferGeometry(); sGeo.setAttribute('position', new T.BufferAttribute(sp.pos, 3)); sGeo.setAttribute('color', new T.BufferAttribute(sp.col, 3)); sGeo.boundingSphere = new T.Sphere(new T.Vector3(0, 1, -62), 60);
const sparkPts = new T.Points(sGeo, new T.PointsMaterial({ size: .16, map: dotTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); sparkPts.frustumCulled = false; sparkPts.renderOrder = 9; yard.add(sparkPts);
const NC = 56, scrapMesh = new T.InstancedMesh(new T.BoxGeometry(.09, .025, .06), new T.MeshStandardMaterial({ color: 0x9aa2a6, roughness: .35, metalness: .95, emissive: 0x331a08 }), NC); scrapMesh.frustumCulled = false; yard.add(scrapMesh);
const scrap = Array.from({ length: NC }, () => ({ p: new T.Vector3(0, -50, 0), v: new T.Vector3(), r: new T.Euler(), w: new T.Vector3(), age: 99, life: 1, s: 1 })); let sk = 0;
const flashes = Array.from({ length: 5 }, () => { const s = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: 0xfff0c0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 10; yard.add(s); return { s, age: 99, size: 1 } }); let fk = 0;
const arcs = Array.from({ length: 5 }, () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(9 * 3), 3)); const l = new T.Line(g, new T.LineBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); l.visible = false; l.frustumCulled = false; l.renderOrder = 10; yard.add(l); return { l, age: 99 } }); let ak = 0;
const tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), one = new T.Vector3(1, 1, 1), tmpV = new T.Vector3();
function worldPos(ring, lx, ly, lz) { return yard.worldToLocal(ring.localToWorld(tmpV.set(lx, ly, lz))).clone() }
function impactFX(lx, lz, ax, az, power, blocked) {
  const ring = F[0].ring, P = worldPos(ring, lx, .9, lz), adir = yard.worldToLocal(ring.localToWorld(new T.Vector3(lx + ax, .9, lz + az))).sub(P).normalize();
  const nSp = Math.round((blocked ? 22 : power > .8 ? 110 : 44) * cfg.sparks), nSc = Math.round((blocked ? 1 : power > .8 ? 9 : 3) * cfg.scrap);
  for (let i = 0; i < nSp; i++) {
    const k = sp.k = (sp.k + 1) % NS, spd = rnd(3, power > .8 ? 13 : 8), j = rnd(0, 1), c = Math.random() < .3 ? [.45, .85, 1] : j < .5 ? [1, .95, .7] : [1, .55, .15];
    sp.pos[k * 3] = P.x; sp.pos[k * 3 + 1] = P.y; sp.pos[k * 3 + 2] = P.z;
    sp.vel[k * 3] = (adir.x * .5 + rnd(-1, 1)) * spd * .8; sp.vel[k * 3 + 1] = rnd(.1, 1.4) * spd * .7; sp.vel[k * 3 + 2] = (adir.z * .5 + rnd(-1, 1)) * spd * .8;
    sp.base[k * 3] = c[0]; sp.base[k * 3 + 1] = c[1]; sp.base[k * 3 + 2] = c[2]; sp.age[k] = 0; sp.life[k] = rnd(.35, power > .8 ? 1.3 : .8);
  }
  for (let i = 0; i < nSc; i++) { const s = scrap[sk = (sk + 1) % NC]; s.p.copy(P); s.v.set(adir.x * rnd(0, 3) + rnd(-2, 2), rnd(2.5, 6), adir.z * rnd(0, 3) + rnd(-2, 2)); s.w.set(rnd(-14, 14), rnd(-14, 14), rnd(-14, 14)); s.r.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); s.age = 0; s.life = rnd(1.1, 2); s.s = rnd(.8, 1.6) }
  const fl = flashes[fk = (fk + 1) % flashes.length]; fl.s.position.copy(P); fl.age = 0; fl.size = blocked ? 1.1 : power > .8 ? 3 : 1.7; fl.s.visible = true;
  if (cfg.arcs && !blocked) for (let a = 0; a < (power > .8 ? 3 : 1); a++) { const A = arcs[ak = (ak + 1) % arcs.length], ar = A.l.geometry.attributes.position.array, dir = new T.Vector3(rnd(-1, 1), rnd(-.3, 1), rnd(-1, 1)).normalize(); let cx = P.x, cy = P.y, cz = P.z; for (let i = 0; i < 9; i++) { ar[i * 3] = cx; ar[i * 3 + 1] = cy; ar[i * 3 + 2] = cz; cx += dir.x * .22 + rnd(-.12, .12); cy += dir.y * .22 + rnd(-.12, .12); cz += dir.z * .22 + rnd(-.12, .12) } A.l.geometry.attributes.position.needsUpdate = true; A.age = 0; A.l.visible = true }
  playHit(power, blocked, P);
}
function fxTick(dt) {
  for (let i = 0; i < NS; i++) {
    if (sp.age[i] >= sp.life[i]) { if (sp.pos[i * 3 + 1] > -40) { sp.pos[i * 3 + 1] = -50; sp.col[i * 3] = sp.col[i * 3 + 1] = sp.col[i * 3 + 2] = 0 } continue }
    sp.age[i] += dt; sp.vel[i * 3 + 1] -= 13 * dt; const dr = Math.exp(-dt * .9); sp.vel[i * 3] *= dr; sp.vel[i * 3 + 2] *= dr;
    sp.pos[i * 3] += sp.vel[i * 3] * dt; sp.pos[i * 3 + 1] += sp.vel[i * 3 + 1] * dt; sp.pos[i * 3 + 2] += sp.vel[i * 3 + 2] * dt;
    if (sp.pos[i * 3 + 1] < .03) { sp.pos[i * 3 + 1] = .03; sp.vel[i * 3 + 1] *= -.4 }
    const f = (1 - sp.age[i] / sp.life[i]) * (.6 + .4 * Math.random()); sp.col[i * 3] = sp.base[i * 3] * f; sp.col[i * 3 + 1] = sp.base[i * 3 + 1] * f; sp.col[i * 3 + 2] = sp.base[i * 3 + 2] * f;
  }
  sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
  for (let i = 0; i < NC; i++) {
    const s = scrap[i]; if (s.age >= s.life) { tmpM.makeScale(0, 0, 0); scrapMesh.setMatrixAt(i, tmpM); continue }
    s.age += dt; s.v.y -= 15 * dt; s.p.addScaledVector(s.v, dt); if (s.p.y < .05) { s.p.y = .05; s.v.y *= -.45; s.v.x *= .7; s.v.z *= .7; s.w.multiplyScalar(.6) }
    s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt; tmpQ.setFromEuler(s.r); const k = s.s * Math.min(1, (s.life - s.age) * 3); tmpM.compose(s.p, tmpQ, tmpV.set(k, k, k)); scrapMesh.setMatrixAt(i, tmpM);
  }
  scrapMesh.instanceMatrix.needsUpdate = true;
  for (const f of flashes) { if (f.age >= .22) { f.s.visible = false; continue } f.age += dt; const u = f.age / .22; f.s.scale.setScalar(f.size * (.4 + u * 1.2)); f.s.material.opacity = (1 - u) * (1 - u) }
  for (const a of arcs) { if (a.age >= .13) { a.l.visible = false; continue } a.age += dt; a.l.material.opacity = Math.random() < .6 ? 1 - a.age / .13 : .15 }
}

// ---- sound: randomised heavy metal grind + electric zap, built from noise and oscillators --------------------------------------------------------------------------------------------------------------
let noiseBuf = null;
function playHit(power, blocked, P) {
  if (!cfg.sound || window.AshfallSettings?.state?.arenaFightSounds === false) return; const A = window.AshfallSettings?.audio, ctx = A?.context; if (!ctx || ctx.state !== 'running') return; const out = A.sfx || A.master || ctx.destination;
  const cam = window.AshfallHubScene?.camera, d = cam ? cam.getWorldPosition(tmpV).distanceTo(yard.localToWorld(P.clone())) : 20, vol = cfg.volume * clamp(1.1 - d / 70, .12, 1) * (blocked ? .5 : power > .8 ? 1 : .6);
  if (vol < .02) return; const t = ctx.currentTime;
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1 }
  const mix = ctx.createGain(); mix.gain.value = vol; mix.connect(out);
  // metal-on-metal clang: a few detuned, quickly decaying partials
  for (const m of [1, 1.51, 2.37, 3.1]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = Math.random() < .5 ? 'square' : 'triangle'; o.frequency.value = rnd(180, 320) * m * (power > .8 ? .8 : 1.1); g.gain.setValueAtTime(.16 / m, t); g.gain.exponentialRampToValueAtTime(.0008, t + (power > .8 ? .45 : .22)); o.connect(g).connect(mix); o.start(t); o.stop(t + .5) }
  // grinding: band-passed noise sweeping down, with a rough growl underneath
  const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(), dur = power > .8 ? rnd(.38, .7) : rnd(.18, .3); n.buffer = noiseBuf; n.loop = true; bp.type = 'bandpass'; bp.Q.value = rnd(3, 9);
  bp.frequency.setValueAtTime(rnd(1800, 3200), t); bp.frequency.exponentialRampToValueAtTime(rnd(300, 700), t + dur); ng.gain.setValueAtTime(.55, t); ng.gain.exponentialRampToValueAtTime(.001, t + dur); n.connect(bp).connect(ng).connect(mix); n.start(t, Math.random() * .5); n.stop(t + dur + .05);
  const gr = ctx.createOscillator(), gg = ctx.createGain(); gr.type = 'sawtooth'; gr.frequency.setValueAtTime(rnd(70, 110), t); gr.frequency.exponentialRampToValueAtTime(rnd(35, 55), t + dur); gg.gain.setValueAtTime(.3, t); gg.gain.exponentialRampToValueAtTime(.001, t + dur); gr.connect(gg).connect(mix); gr.start(t); gr.stop(t + dur + .05);
  // electric zap (not on a block): a fast downward saw chirp plus crackle
  if (!blocked) { const z = ctx.createOscillator(), zg = ctx.createGain(), zd = rnd(.1, .22); z.type = 'sawtooth'; z.frequency.setValueAtTime(rnd(1800, 3400), t); z.frequency.exponentialRampToValueAtTime(rnd(90, 200), t + zd); zg.gain.setValueAtTime(.22, t); zg.gain.exponentialRampToValueAtTime(.001, t + zd); z.connect(zg).connect(mix); z.start(t); z.stop(t + zd + .02);
    const c = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), cg = ctx.createGain(); c.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = rnd(3500, 6000); cg.gain.setValueAtTime(.25, t); for (let i = 1; i < 6; i++) cg.gain.setValueAtTime(Math.random() * .3, t + i * zd / 6); cg.gain.exponentialRampToValueAtTime(.001, t + zd * 1.4); c.connect(hp).connect(cg).connect(mix); c.start(t); c.stop(t + zd * 1.5) }
}

// ---- frame ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const stats = { hits: 0, last: '-' }; let last = performance.now() / 1000;
const api = window.AshfallFightAI = { cfg, stats, get active() { return cfg.enabled && F.length === 2 }, fighters: F, forceHit(heavy = true) { if (F.length < 2) return; const a = F[Math.random() < .5 ? 0 : 1], o = other(a); a.heavy = heavy; a.struck = false; const keep = o.state; strike({ ...a, heavy, i: a.i, x: o.x - Math.sin(a.yaw) * 1, z: o.z - Math.cos(a.yaw) * 1 }); o.state = keep }, get states() { return F.map(f => f.state).join(' vs ') } };
const orig = MM.update;
MM.update = function (dt, t) {
  if (W.root.visible && yard.visible) {
    const now = performance.now() / 1000, d = Math.min(.05, now - last); last = now;
    try { if (setup() && cfg.enabled) { if (performance.now() >= stopUntil) { for (const f of F) { stepFighter(f, d); apply(f, d) } } fxTick(d) } else if (F.length) fxTick(d) } catch (e) { if (!api.warned) { api.warned = true; console.warn('[fight-ai]', e) } }
  } else last = performance.now() / 1000;
  return orig.call(this, dt, t);
};
})();
