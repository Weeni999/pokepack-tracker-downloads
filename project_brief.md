# Ashfall / COCKPIT: Project Continuation Brief

Paste this whole file into a new LLM session. Everything below was true at the end of the previous session.

## 1. Project overview & aesthetic
- **Game:** "Ashfall" (page title `COCKPIT / ROBO-CHICKEN YARD`, package name `cockpit-yard`). A scrapyard hub where you customise a trainer robot and a mechanical chicken companion, wander a multiplayer yard, and bet on / fight chickens in a pit.
- **Look:** procedural low-poly 3D (Three.js, flat/faceted shading, no imported assets) under a CRT/PS1-style presentation: scanlines, grain, pixel-block glitch, dark scene with sodium-orange and green accent lights. UI is a dark, atmospheric **green terminal theme** (monospace, `[ BRACKETED ]` buttons, glowing green on near-black).
- **Project folder:** `C:\Users\Jhaveen Flood\Documents\Codex\2026-10-26\https-www-youtube-com-watch-v\outputs\ashfall-menu`
- **Stack:** plain browser JavaScript, no build step, `vendor/three.min.js` (r15x), globals on `window.Ashfall*`, many files are dense one-line-per-block minified-style code (match that style; do not put `//` comments at the end of a dense line, it swallows the rest of the line). Node server `server.mjs` (static files + WebSocket world server + live reload).
- **Run:** `node server.mjs` (or `start-preview.cmd`), default `http://127.0.0.1:4173` (`PORT` env var changes it). Any file save triggers a browser live reload. World state persists to `world-data/world-state.json`. **Restart the server after editing `lobby-config.js`, `lobby-instances.mjs`, `world-server.mjs`.**
- Script load order is the `defer` list in `index.html` (order matters: `scene.js` -> `models-*.js` -> `chicken-models.js` -> `skins-*.js` -> lobby scripts -> `third-person-camera.js`, `dev-menu.js`, `esc-nav.js`, `lobby-navigation.js` ...).

## 2. Implemented features & architecture

### Camera, movement, locomotion (`third-person-camera.js`, `lobby-navigation.js`, `LOCOMOTION.md`)
- `AshfallThirdPerson` owns: smoothed mouse-look (yaw 360 deg, pitch clamped -32..+60 deg), over-the-shoulder camera with wall clipping (rooms/obstacles from `AshfallLobbyConfig`), body-facing easing (turn rate + idle dead zone), accelerated 8-way steering, and a **locomotion blend space** (body-space angle -180..180 + speed -> IDLE/WALK/RUN, stride length, constant-velocity stance, telescoping legs). Measured foot slide: about 0.1-0.5% of body travel on all legged models, all 8 directions, walk and sprint.
- All tuning lives in `AshfallTuning` (saved in localStorage `cockpit_tuning_v1`): offsets, distance, smoothing, sensitivity, pitch limits, turn rate, walk/sprint speed, accel/decel, strides, leg lift, lean.
- Movement speed is shared with the server (`lobby-config.js` `speeds` 5.4 / 9; client sends `speed`, server clamps 0.5-14).
- **Dev menu:** press **9** (`dev-menu.js`): sliders + number fields for every tuning value, live locomotion telemetry (state, direction, angle, speed, cadence), reset/copy JSON. Releases pointer lock while open.
- **Esc = back** (`esc-nav.js`): closes dev menu / settings / chat panel, then steps back through screens (locker -> previous -> main menu); in the yard with nothing open it opens pause/settings.

### Locker / customise screen (`locker-stage.js`, `robot-customizer.js`, `chicken-customizer.js`)
- Clean spotlight stage: menu scenery (fence, walls, cage) is hidden while the locker is open and restored after.
- **Dynamic framing:** `profile()` in `locker-stage.js` returns the camera framing for the active tab. Robot tab: derived from the selected base model's measured height/width. Chicken tab: derived from the selected chicken model's height/length. Camera eases to the new target (about 0.25 s, instant with reduced motion), light aim and actor position follow the tab. Free-viewport aspect is measured so the model centres between the UI panel and screen edge.
- Robot tab = one **Base Model** select + **Skin Set** bar; Chicken tab = one **Model** select (+ name + randomize). Old paint/hat/chain/part controls are hidden/removed for the clean-slate libraries.

### UI shortcuts
- **Shift + L** (`locker-stage.js`): toggles the whole Stage Lighting panel (hidden + `inert` when off; focus is released and restored; ignored while typing in text fields; preference saved `ashfall_stage_ui_hidden`).
- **Shift + R** (`ui-toggle.js`): toggles the bottom media player (`#cockpit-media`) and the bottom-right Cockpit Radio (`#cockpit-radio-dock`) together via a root CSS class (layout/playback state untouched; focus released/restored; saved `ashfall_media_ui_hidden`).
- Music no longer auto-starts on click/keypress: only the radio's own PLAY SONG / ENABLE SOUND controls start it (`media-player.js`).

### Multiplayer / server notes
- `world-client.js` <-> `world-server.mjs` / `lobby-instances.mjs` (authoritative movement, doors, arrival, presence, companion presence).
- Fixed this session: server ignored movement after a page reload because of a stale sequence counter (now accepts a restarted counter); an echo loop between `ashfall-robot-profile` events and server snapshots (snapshot-applied looks are tagged `__fromServer` and not re-sent).
- Remote players' robots use the look code (`skins.js`: index 21 gear (legacy), 22 base model, 23 skin set); remote companions apply `AshfallChickenModels` from the chicken's `visual`.

## 3. Character & asset library

### 5 base robot models (`models-core.js`, `models-a.js`, `models-b.js`)
Profile key `model` ('0'-'4'): 0 Heavy Industrial Mech, 1 Service Orb (wheels), 2 Chrome Filigree android, 3 Gaunt Scavenger, 4 Barrel Hauler. Procedural geometry + canvas weathering textures (rust, chips, rivets as bump maps) + a PMREM reflection environment. Each model builder returns a rig: `legs[]` (hip pivot, foot group, leg length), `arms[]` (shoulder, optional elbow with static bend), optional `wheels`, `idle`, and `sockets`. `AshfallModels.update` copies the hidden stock limbs (`limb0..3`, `boot0/1`) onto the rig each frame; resting poses fade out while moving. The original stock robot, hats and neck chains are hidden. The earlier 25-style-per-slot "exo" armour system is parked in `legacy/exo/` (not loaded).

### 5 base cyber-poultry models (`chicken-models.js`)
Chicken `visual.model` ('0'-'4', persisted with the chicken and synced by the server): 0 Tanky Boiler Mech (tracks, headlamp, flatbed rail), 1 Digital-Face Egg Bot (LED matrix face, decal, filigree wings, treads), 2 Royal Filigree Android (chrome + gold, jewelled crown, filigree tail/wings), 3 Gaunt Skeletal Scavenger (skull, ribcage, red heart, green eye), 4 Armored Bipedal Mech (orange/grey plates, wire-cage helmet; default for new chickens). Old stock bird meshes are hidden. Only small idle animations (flap, tread scroll, glow pulses); companion glides, no leg animation. Existing chickens without a model get a stable pick from their id.

### Modular skin sets (`skins-core.js`, `skins-a.js`, `skins-b.js`, `SKINSETS.md`)
- **Sockets:** every robot exports `sockets` (head, chest, back, shoulderL/R, armL/R, thighL/R, shinL/R), each `{parent, hull}` with an analytic hull (ellipsoid / cylinder / box) and optional `fmap` band. Skins are built against hulls (`H.shell`, `H.pos`, `H.on`, `H.tether`, `U.band/arc/slab/spike`) so one definition fits all bodies; missing sockets are skipped.
- **10 sets** (profile `skinSet` '-1' = none, '0'-'9'): Hypebeast Streetwear, Elemental Plasma Pyre, Void-Rift Abyssal, Dark Ominous Dread, Cyber-Ronin, Bio-Organic Symbiote, Glitch-Matrix Cyber-Runner, Royal Obsidian Syndicate, Industrial Nuclear Hazmat, Celestial Starlight Vanguard.
- **Randomizer** (`AshfallSkinSets.randomizer`): `combos()`, `next()` (shuffled bag, no repeats, applies + QA + auto-fix, quarantines combos that stay broken), `start(ms)/stop()`, `applyCombo(root,m,s)`; `isValid(m,s)` rejects null/non-integer/out-of-range and skins whose required sockets the model lacks. Locker UI: Skin Set select, [RANDOMIZE], [LOOP], [QA REPORT].
- **QA** (`qa(root,{fix,poses})`, auto-run on every build): clip (snap out of own hull), detached parts (tether strut), pose check at rest / arm swing / leg stride against other sockets' hulls (nudge, then shrink). Logger: `AshfallSkinSets.getLog()` and `[SKINQA]` console lines. `audit(root)` verifies a cleared skin leaves nothing behind. Result: all 50 model x skin combinations pass with zero residue; about 361 auto-corrections across the matrix (Hypebeast and Obsidian authored loosest).
- **Dev harness** `dev-studio.js` (not loaded by the page): in the console run `fetch('/dev-studio.js').then(r=>r.text()).then(t=>(0,eval)(t))`, then `__matrix()` (QA all 50), `__studio3(name,[[model,skin],...],yaws,cols)` and `__studioC(name,[models],yaws,cols)` (render through the game renderer; they POST PNGs to a local receiver on `127.0.0.1:4175`, which you must provide if you want images).

## 4. Current objectives / next steps
**Known issues**
1. `skin-customizer.js:31` throws `Cannot set properties of null (setting 'value')` every time the locker opens (the old outfit studio looks for `[data-skin-select]` inside the wrong container). The locker still works; the legacy outfit panel is hidden. Either fix or remove that old system.
2. Skin sets: only checked at rest/poses with simplified hull maths, so spot-check combinations by eye (Hypebeast brim and front details on the orb, Ronin scabbard, Starlight wings and Runner ribbons are rear/animated and barely checked). Remote players' skins are wired but untested.
3. Chicken models have no walk animation; the Royal Android is still slim, the Scavenger's eyes are oversized. Robots' look is close to the reference images but not exact (Chrome android is the weakest likeness).
4. Locker panel (customiser) layout was not visually reviewed beside the 3D stage; only canvas renders were checked.
5. Browser-pane testing quirks: the preview pane must be visible for animation frames; live reload cuts running scripts after a file save (wait a few seconds before testing); synthetic key events dispatched on `window` trigger a harmless `e.target.closest` error in `lobby-social.js`.

**Suggested next work**
- Fix or delete `skin-customizer.js` / outfit studio and the `.skin-studio` CSS hide.
- Per-model polish pass against the reference images; knee bends for legs; chicken companion walk cycle.
- Chicken skins (reuse the socket/hull engine with chicken sockets).
- Visual review of every skin x model in the locker at real resolution; tune the loosest sets (Hypebeast, Obsidian) so fewer auto-fixes are needed.
- Persist/verify the `model` and `skinSet` through the real server round trip and with a second connected player.
- Re-balance camera/tuning defaults per model (tall Chrome android vs short Orb) if needed.
- Gameplay still to build on top of the library: stats/abilities tied to model choice, unlocks/shop for models and skins, pit fight visuals using the new chicken models.
