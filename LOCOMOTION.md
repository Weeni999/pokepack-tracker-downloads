# Locomotion: mouse-look, facing, 8-way blend space

All of it lives in `third-person-camera.js` (state + math) and is called from `lobby-navigation.js` (input) and `exo-core.js` (applies the pose to the armour). Every number is live-tunable in the dev menu (press 9).

## Pipeline per frame
1. **Look** `AshfallThirdPerson.look(dx,dy)` (mouse) -> target yaw/pitch. Pitch is clamped to `pitchMin..pitchMax` (default -32..+60 deg); yaw wraps freely (360). `step(dt)` smooths both with `1-exp(-lookSmoothing*dt)` (0 = raw).
2. **Camera** `update()` orbits the smoothed yaw/pitch, shoulder offset + wall clipping (see earlier notes).
3. **Steer** WASD is read relative to the *camera* yaw: `x = sin(y)*fwd - cos(y)*right`, `z = cos(y)*fwd + sin(y)*right` (8 directions, diagonals normalised). `steer()` applies accel/decel to a velocity; the server gets the smoothed input + `speed`.
4. **Facing** `faceUpdate()` eases the body yaw to the camera yaw with rate `turnRate` (about 1/turnRate seconds). Moving => always aligns. Idle => only aligns once the camera is more than `idleDeadzone` deg away, then settles.
5. **Blend space** `animate()` converts ground velocity into BODY space:
   - `angle = atan2(right, forward)` in -180..180 (0 fwd, +90 right, -90 left, 180 back), smoothed as a unit vector so crossing +-180 never pops.
   - speed -> `moveW` (idle<->moving) and `runW` (smoothstep between walk and sprint speed).
   - State machine: `IDLE` (moveW<.08) -> `WALK` -> `RUN` (runW>.5), direction label FWD / FWD-R / RIGHT / BACK-R / BACK / BACK-L / LEFT / FWD-L.
6. **Gait (no foot sliding)**
   - `stride = lerp(strideWalk, strideRun, runW) * (1 - (1-strideStrafe)*|right|)`; phase advances `speed*dt*2pi/stride`, so cadence = speed/stride (play-rate scales with speed by construction).
   - Stance: foot moves at constant speed relative to the body (equal to ground speed); swing: cosine return with lift `legLift`.
   - Planted foot target (body space) = `(L*S*ur*f, -L, -L*S*uf*f)`, `S = stride/(4L)`, `L = .9`. Thigh Euler angles `a = atan(S*uf*f)`, `b = atan(cos(a)*S*ur*f)`; the leg telescopes by `1/(cos a cos b)` (`exo-core.js`, `update`) so the sole stays on the floor.
   - Arms counter-swing, the body leans into the travel direction (`lean`), feet lift per leg.

## Dev menu telemetry
STATE / DIR / ANGLE / SPEED / CADENCE / STRIDE / RUN BLEND / MOVE weight, live.

## Measured (preview, planted-foot interval drift / body travel)
Forward, strafe, back, diagonals, walk and sprint: median 0.7%-2% (p90 mostly under 3%).

## Integration notes
- Replace the stock walk code by calling `AshfallThirdPerson.animate(robot, dt, reduced, emote)` once per frame after the robot position is updated, and `faceUpdate(robot, hasInput, dt)` before it.
- Rigs need: thigh/arm driver nodes `limb0..limb3` (arm L, thigh L, arm R, thigh R) and `boot0/boot1`. `exo-core.js` copies them onto the armour pivots; a different rig only needs its own copy step reading `rotation.x/.z` and the telescope scale above.
- In an engine blend tree: use the same parameters as 2D inputs (`angle` -180..180, `speed`), idle/walk/run clips at 8 angles, and drive the play-rate with `speed/stride`.
