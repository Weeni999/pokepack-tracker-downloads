/* Camera, mouse-look, body facing and locomotion blend space, driven by one live-tunable settings object.
   Layers (see LOCOMOTION.md):
     look      mouse -> target yaw/pitch -> exponentially smoothed yaw/pitch (pitch clamped, yaw free 360)
     camera    over-the-shoulder boom around the smoothed yaw/pitch, wall-clipped
     facing    body yaw eases toward camera yaw while moving (or when the camera leaves the idle dead zone)
     steer     camera-relative WASD -> accelerated velocity (8-way: forward/back/left/right + diagonals)
     blend     velocity in BODY space -> angle (-180..180) + speed -> idle/walk/run weights -> gait pose
     gait      phase advances with ground distance (stride length), so foot speed matches ground speed */
(() => {
  'use strict';
  const C = AshfallLobbyConfig, T = THREE, STORE = 'cockpit_tuning_v1', PI = Math.PI, DEG = PI / 180;
  const defaults = {
    offsetX: 1.4, offsetY: .55, offsetZ: 0, pivotHeight: 2, distance: 5, smoothing: 16,
    sensitivity: 1, lookSmoothing: 28, pitchMin: -32, pitchMax: 60,
    turnRate: 12, idleDeadzone: 70,
    walkSpeed: 5.4, sprintSpeed: 9, accel: 38, decel: 52,
    strideWalk: 2, strideRun: 2.9, strideStrafe: .7, legLift: .16, lean: 1
  };
  const tuning = { ...defaults };
  try { Object.assign(tuning, JSON.parse(localStorage.getItem(STORE) || '{}')) } catch {}
  for (const k of Object.keys(tuning)) if (!(k in defaults) || !Number.isFinite(tuning[k])) { if (k in defaults) tuning[k] = defaults[k]; else delete tuning[k] }

  let L = .9, camScale = 1;                      // hip-to-floor leg length of the active model (sizes the swing so feet do not slide); camera height scale
  function setBody(b) { if (b.legLength) L = b.legLength; if (b.scale) camScale = b.scale }
  const wrap = a => { a = (a + PI) % (PI * 2); return (a < 0 ? a + PI * 2 : a) - PI };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t) };
  const vel = { x: 0, z: 0 };
  const head = new T.Vector3(), want = new T.Vector3(), aim = new T.Vector3(), lookDir = new T.Vector3();
  let yawT = PI, yawS = PI, pitchT = .22, pitchS = .22, aligning = false, boom = 1;

  function save() { try { localStorage.setItem(STORE, JSON.stringify(tuning)) } catch {} }

  // ---- look: mouse -> target, smoothed -> used by camera, movement frame and body facing ---------------------------------------
  const pitchLimits = () => [tuning.pitchMin * DEG, tuning.pitchMax * DEG];
  function look(dx, dy) {
    const s = .002 * tuning.sensitivity * (AshfallSettings?.state?.sensitivity || 1), [lo, hi] = pitchLimits();
    yawT = wrap(yawT - dx * s);                       // 360 degrees, no clamp
    pitchT = clamp(pitchT + dy * s, lo, hi);          // clamped: the camera can never flip over
  }
  function setYaw(v, instant) { yawT = wrap(v); if (instant) yawS = yawT }
  function step(dt) {
    const [lo, hi] = pitchLimits();pitchT = clamp(pitchT, lo, hi);
    const a = tuning.lookSmoothing > 0 ? 1 - Math.exp(-tuning.lookSmoothing * dt) : 1;
    yawS = wrap(yawS + wrap(yawT - yawS) * a); pitchS += (pitchT - pitchS) * a;
  }

  // ---- body facing: ease toward the camera forward direction when moving; idle only past the dead zone ------------------------
  function faceUpdate(robot, moving, dt) {
    const d = wrap(yawS - robot.rotation.y), dead = tuning.idleDeadzone * DEG;
    if (moving || Math.abs(d) > dead) aligning = true; else if (Math.abs(d) < .03) aligning = false;
    if (aligning) robot.rotation.y = wrap(robot.rotation.y + d * (1 - Math.exp(-tuning.turnRate * dt)));
  }

  // A camera point is clear when it sits inside a walkable room and outside the statues.
  const clear = (x, z) => C.rooms.some(([a, b, c, d]) => x >= a && x <= b && z >= c && z <= d) && !C.obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.r);

  function update(dt, robot, camera) {
    if (window.AshfallEntrySequence?.state !== 'IN_WORLD') { yawT = yawS = wrap(robot.rotation.y) }   // follow scripted entry walk
    const yaw = yawS, pitch = pitchS, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    lookDir.set(fx * cp, -sp, fz * cp);
    head.set(robot.position.x, robot.position.y + tuning.pivotHeight * camScale, robot.position.z);
    // Shoulder pivot, then the boom runs backwards along the aim direction.
    want.set(head.x + rx * tuning.offsetX + fx * tuning.offsetZ, head.y + tuning.offsetY, head.z + rz * tuning.offsetX + fz * tuning.offsetZ);
    want.addScaledVector(lookDir, -tuning.distance);
    // Wall clipping: walk the player->camera segment and stop at the first blocked sample.
    let allowed = 1;
    const N = 16;
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      if (!clear(head.x + (want.x - head.x) * t, head.z + (want.z - head.z) * t)) { allowed = Math.max(0, (i - 1) / N - .5 / N * (tuning.distance > 1 ? 1 : 0)); break }
    }
    boom += (allowed - boom) * Math.min(1, dt * (allowed < boom ? 40 : 3));
    want.lerpVectors(head, want, boom);
    want.y = Math.min(7, Math.max(.35, want.y));
    camera.position.lerp(want, 1 - Math.exp(-dt * tuning.smoothing));
    aim.copy(camera.position).addScaledVector(lookDir, 24);
    camera.lookAt(aim);
  }

  // ---- 8-way steering: input is a camera-relative world direction; returns smoothed input + speed for movement and the server ---
  function steer(x, z, sprint, dt) {
    const speed = sprint ? tuning.sprintSpeed : tuning.walkSpeed, len = Math.hypot(x, z), k = len > 1 ? 1 / len : 1;
    const tx = x * k * speed, tz = z * k * speed, dx = tx - vel.x, dz = tz - vel.z, dist = Math.hypot(dx, dz);
    const rate = (len > .01 ? tuning.accel : tuning.decel) * dt;
    if (dist <= rate) { vel.x = tx; vel.z = tz } else { vel.x += dx / dist * rate; vel.z += dz / dist * rate }
    if (len <= .01 && Math.hypot(vel.x, vel.z) < .05) { vel.x = 0; vel.z = 0 }
    return { x: vel.x / speed, z: vel.z / speed, speed, moving: vel.x !== 0 || vel.z !== 0 };
  }
  function stop() { vel.x = vel.z = 0 }

  // ---- locomotion blend space -----------------------------------------------------------------------------------------------------
  // Axes: BODY-space direction angle (0 = forward, +90 = right, +-180 = back) and speed. Samples: idle, walk, run in 8 directions,
  // evaluated analytically (leg swing x ~ cos(angle), leg swing z ~ sin(angle)) so every angle in between blends with no popping.
  const loco = { speed: 0, angle: 0, state: 'IDLE', dir: '', rate: 0, stride: 0, run: 0, weight: 0, phase: 0 };
  // makeLoco: the whole blend space lives in a closure so every character (the player and each roaming bot) has its own phase, direction and blend weights
  function makeLoco(loco) {
  let phase = 0, dirAng = 0, uf = 1, ur = 0, moveW = 0, runW = 0, lastX = null, lastZ = null, liftL = 0, liftR = 0, leanX = 0, leanZ = 0, spdS = 0;
  // Gait curve: stance = foot travels at CONSTANT speed relative to the body (equal to ground speed => zero slide); swing = cosine return.
  // f in [-1,1] is the normalised foot excursion, lift in [0,1] is the swing-phase foot height.
  function gait(ph) {
    const m = ((ph % (PI * 2)) + PI * 2) % (PI * 2);
    if (m < PI / 2 || m > PI * 1.5) return { f: (m > PI ? m - PI * 2 : m) / (PI / 2), lift: 0 };
    const u = (m - PI / 2) / PI; return { f: Math.cos(PI * u), lift: Math.sin(PI * u) };
  }
  const DIRS = ['FWD', 'FWD-R', 'RIGHT', 'BACK-R', 'BACK', 'BACK-L', 'LEFT', 'FWD-L'];

  function animate(robot, dt, reduced, emote) {
    const px = robot.position.x, pz = robot.position.z;
    let gx = 0, gz = 0;
    if (lastX !== null && dt > 0) { gx = (px - lastX) / dt; gz = (pz - lastZ) / dt }
    lastX = px; lastZ = pz;
    let speed = Math.hypot(gx, gz); if (speed > 20) { gx = gz = speed = 0 }        // ignore teleports / reconcile snaps
    const by = robot.rotation.y, sn = Math.sin(by), cs = Math.cos(by);
    const fwd = gx * sn + gz * cs, right = -gx * cs + gz * sn;                      // velocity in body space
    if (speed > .15) {
      // smooth the direction as an ANGLE along the shortest arc (a vector lerp collapses to zero when reversing)
      const k2 = 1 - Math.exp(-dt * 14); dirAng = wrap(dirAng + wrap(Math.atan2(right, fwd) - dirAng) * k2); uf = Math.cos(dirAng); ur = Math.sin(dirAng);
    }
    // speed is smoothed and the moving/idle switch has hysteresis, so noisy position deltas near a stop cannot flip the state back and forth
    spdS += (speed - spdS) * (1 - Math.exp(-dt * 16));
    const moving = (moveW > .15 ? spdS > .18 : spdS > .3) && !reduced;
    moveW += ((moving ? 1 : 0) - moveW) * (1 - Math.exp(-dt * (moving ? 12 : 5.5)));
    runW += (smooth(tuning.walkSpeed * .9, tuning.sprintSpeed * .95, speed) - runW) * (1 - Math.exp(-dt * 8));
    // gait: stride grows walk->run and shrinks when strafing; phase is distance driven => cadence scales with speed
    const stride = (tuning.strideWalk + (tuning.strideRun - tuning.strideWalk) * runW) * (1 - (1 - tuning.strideStrafe) * Math.abs(ur));
    // the stride keeps cycling while the blend weight fades out, so the legs ease back to the rest pose instead of snapping when the character stops
    const adv = moving ? spdS : moveW * 1.1; if (adv > .01) phase = (phase + adv * dt * PI * 2 / stride) % (PI * 2 * 1000);
    // swing sized from stride so the planted foot's speed equals ground speed: excursion = stride/4 each side of the hip
    const S = clamp(stride / (4 * L), 0, .95), sinP = Math.sin(phase), cosP = Math.cos(phase);
    const gA = gait(phase), gB = gait(phase + PI), w = moveW;
    // Planted foot target in body space is (L*S*ur*f, -L, -L*S*uf*f). With the leg telescoping to length L/(cos a cos b), the XYZ-Euler thigh
    // angles that hit that point exactly are a = atan(S*uf*f), b = atan(cos(a)*S*ur*f).
    const solve = f => { const a = Math.atan(S * uf * f * w), b = Math.atan(Math.cos(a) * S * ur * f * w); return [a, b] };
    const [aA, bA] = solve(gA.f), [aB, bB] = solve(gB.f);
    const armK = .6 + .3 * runW, armA = Math.asin(clamp(uf * S * .8, -.95, .95)) * moveW;
    const set = (name, x, z) => { const o = robot.getObjectByName(name); if (o) { o.rotation.x = x; if (z !== undefined) o.rotation.z = z } };
    set('limb1', aA, bA);  set('limb3', aB, bB);                                    // legs, opposite phase
    set('limb0', -armA * sinP * armK);    set('limb2', armA * sinP * armK);         // arms counter-swing their opposite leg
    // foot lift: swing phase of each leg (cos < 0 for leg A), scaled by run blend
    const lift = tuning.legLift * (.55 + .45 * runW) * moveW, tL = gA.lift * lift, tR = gB.lift * lift;
    liftL = tL; liftR = tR;   // the gait curve is already continuous: no extra smoothing (it would lift/plant the foot late)
    const bootL = robot.getObjectByName('boot0'), bootR = robot.getObjectByName('boot1');
    if (bootL) bootL.position.y = .15 + liftL;
    if (bootR) bootR.position.y = .15 + liftR;
    // body lean into the direction of travel
    const k = 1 - Math.exp(-dt * 10);
    leanX += (uf * moveW * tuning.lean * (.03 + .07 * runW) - leanX) * k;
    leanZ += (ur * moveW * tuning.lean * .05 - leanZ) * k;
    robot.rotation.x = leanX; if (emote !== 'dance') robot.rotation.z = leanZ;
    // telemetry / state machine view of the blend: IDLE <-> WALK <-> RUN with 8-way direction label
    const ang = Math.atan2(ur, uf), idx = ((Math.round(ang / (PI / 4)) % 8) + 8) % 8;
    Object.assign(loco, { speed, angle: ang / DEG, state: moveW < .08 ? 'IDLE' : runW > .5 ? 'RUN' : 'WALK', dir: moveW < .08 ? '-' : DIRS[idx], rate: moving ? speed / stride : 0, stride, run: runW, weight: moveW, phase });
  }
  return { animate, loco };
  }
  const player = makeLoco(loco), animate = player.animate;
  const createLoco = () => makeLoco({ speed: 0, angle: 0, state: 'IDLE', dir: '', rate: 0, stride: 0, run: 0, weight: 0, phase: 0 });

  window.AshfallTuning = tuning;
  window.AshfallThirdPerson = { createLoco,
    defaults, tuning, update, look, step, setYaw, faceUpdate, steer, stop, animate, save, loco, setBody, snap(robot,camera){yawT=yawS=wrap(robot.rotation.y);pitchT=pitchS=.22;boom=1;update(2,robot,camera)},
    reset() { Object.assign(tuning, defaults); save() },
    get yaw() { return yawS }, get pitch() { return pitchS },
    set pitch(v) { const [lo, hi] = pitchLimits(); pitchT = pitchS = clamp(v, lo, hi) }
  };
})();
