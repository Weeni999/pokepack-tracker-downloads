/* Developer menu: press 9 anywhere to toggle a tabbed overlay of live tweaks.
   GRAPHICS  menu lighting (via AshfallCinematicMenu.settings), fog, spotlight, neon sign, post effects
   PLAYER    camera + movement tuning (AshfallThirdPerson.tuning, saved in this browser)
   ROSTER    live swap of robot model / chicken model / skin sets, animation forcing, hitbox overlays
   WORLD     time scale, FPS + renderer stats, reset scene, clear save data
   Controls whose engine feature does not exist in this game (jump, gravity, fly mode, height fog) are listed as unavailable rather than faked. */
(() => {
  'use strict';
  const TP = window.AshfallThirdPerson, tuning = TP?.tuning || {}, T = window.THREE, hub = window.AshfallHubScene;
  const CM = () => window.AshfallCinematicMenu, ST = () => window.AshfallSettings?.state;
  const CM_KEY = 'ashfall_cinematic_menu_v1';

  const style = document.createElement('style');
  style.textContent = `
#dev-menu{position:fixed;top:12px;left:12px;right:auto;z-index:99999;width:min(390px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:10px 12px;background:#09150eee;color:#ceefa8;border:1px solid #5a8965;font:12px/1.4 monospace;box-shadow:0 0 18px #000a}
#dev-menu[hidden]{display:none}
#dev-menu h2{cursor:grab;touch-action:none;user-select:none;margin:0 0 6px;font-size:13px;letter-spacing:.12em;color:#e5b96f;display:flex;justify-content:space-between}
#dev-menu.is-dragging h2{cursor:grabbing}
#dev-menu h3{margin:10px 0 4px;font-size:11px;letter-spacing:.14em;color:#8effd0;border-bottom:1px solid #5a896555}
#dev-menu .tabs{display:flex;gap:4px;margin:4px 0 6px;flex-wrap:wrap}
#dev-menu .tabs button{margin:0;flex:1;padding:4px 2px}
#dev-menu .tabs button[aria-selected=true]{background:#2a5a3a;color:#fff}
#dev-menu .row{display:grid;grid-template-columns:1fr 64px;gap:2px 8px;margin:4px 0}
#dev-menu .row span{grid-column:1/3}
#dev-menu .tog{display:flex;align-items:center;gap:8px;margin:6px 0}
#dev-menu .sel{display:grid;gap:2px;margin:6px 0}
#dev-menu .na{margin:5px 0;color:#7e9a76;font-size:11px}
#dev-menu input[type=range]{width:100%;accent-color:#8effd0}
#dev-menu input[type=number],#dev-menu select{background:#04100a;color:#ceefa8;border:1px solid #5a8965;font:inherit;padding:1px 3px}
#dev-menu input[type=number]{width:64px}
#dev-menu button{background:#04100a;color:#ceefa8;border:1px solid #5a8965;font:inherit;padding:3px 8px;margin:8px 6px 0 0;cursor:pointer}
#dev-menu button:hover{background:#17301f}
#dev-menu small{display:block;margin-top:8px;color:#7e9a76}
#dev-menu pre{margin:8px 0 0;padding:6px;border:1px solid #5a896555;color:#8effd0;font:11px/1.4 monospace;white-space:pre-wrap}
#dev-fps{position:fixed;left:10px;top:10px;z-index:99998;padding:6px 8px;background:#000b;color:#9dffc4;font:11px/1.35 monospace;white-space:pre;pointer-events:none}
#dev-fps[hidden]{display:none}`;
  document.head.append(style);

  const panel = document.createElement('div');
  panel.id = 'dev-menu'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Developer menu');
  panel.innerHTML = '<h2><span>DEV MENU</span><span>[9] CLOSE</span></h2>';
  const tabBar = document.createElement('div'); tabBar.className = 'tabs'; tabBar.setAttribute('role', 'tablist'); panel.append(tabBar);
  const pages = {}, refreshers = {};
  let current = '', inLocker = false;

  // ---- control builders (each returns nothing; every control registers a refresh so the panel re-reads live values) ----
  const mk = (tag, props = {}, kids = []) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e };
  /* Persistence: every slider / toggle / dropdown outside ROSTER and WORLD is remembered. Values are written when the menu closes, to the local server
     (world-data/dev-settings.json, the project's saved defaults) and to localStorage as a fallback, and are re-applied on every fresh load. */
  const DEV_KEY = 'ashfall_dev_menu_v1', persisted = [];
  const track = (page, label, kind, get, set) => { if (page.dataset.tab !== 'ros' && page.dataset.tab !== 'wld') persisted.push({ key: page.dataset.tab + '|' + label, kind, get, set, cmKey: get?.cmKey }) };
  /* Reset to defaults: every tab gets a RESET button. A control's default is, in order: the cinematic-menu default (for the lighting controls), the game Settings default (FOV), or the
     value the control had the first time the dev menu looked at it, before any saved value was restored (that is the value written in each module's code). */
  const SETTING_KEYS = { 'gfx|Main menu FOV (degrees)': 'menuFov', 'gfx|In-game FOV (degrees)': 'gameFov' };
  function factoryValue(c) {
    if (c.cmKey && CM()?.defaults && CM().defaults[c.cmKey] !== undefined) return CM().defaults[c.cmKey];
    const sk = SETTING_KEYS[c.key]; if (sk && window.AshfallSettings?.defaults && window.AshfallSettings.defaults[sk] !== undefined) return window.AshfallSettings.defaults[sk];
    return c.def;
  }
  function resetTab(id) {
    let n = 0; restoring = true;
    try { for (const c of persisted) { if (!c.key.startsWith(id + '|')) continue; const v = factoryValue(c); if (v === undefined) continue; try { c.set(v); n++ } catch (e) { console.warn('[dev-menu] reset', c.key, e) } } } finally { restoring = false }
    refreshers[id]?.forEach(fn => fn()); try { saveAll() } catch {} return n;
  }
  function slider(page, label, min, max, step, get, set) {
    track(page, label, 'n', get, v => { if (Number.isFinite(v)) set(Math.min(max, Math.max(min, v))) });
    const row = mk('div', { className: 'row' }), name = mk('span', { textContent: label }),
      range = mk('input', { type: 'range', min, max, step }), num = mk('input', { type: 'number', min, max, step });
    const show = () => { const v = get(); if (Number.isFinite(v)) range.value = num.value = +(+v).toFixed(3) };
    const apply = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); set(v); show() };
    range.addEventListener('input', () => apply(Number(range.value))); num.addEventListener('change', () => apply(Number(num.value)));
    row.append(name, range, num); page.append(row); refreshers[page.dataset.tab].push(show);
  }
  function toggle(page, label, get, set) {
    track(page, label, 'b', () => !!get(), v => set(!!v));
    const box = mk('input', { type: 'checkbox' }), row = mk('label', { className: 'tog' }, [box, document.createTextNode(label)]);
    box.addEventListener('change', () => set(box.checked)); page.append(row); refreshers[page.dataset.tab].push(() => { box.checked = !!get() });
  }
  function select(page, label, options, get, set) {
    track(page, label, 's', () => get() === undefined ? undefined : String(get()), set);
    const sel = mk('select'), row = mk('label', { className: 'sel' }, [document.createTextNode(label), sel]);
    const fill = () => { const opts = typeof options === 'function' ? options() : options; sel.replaceChildren(...opts.map(([v, t]) => new Option(t, v))); const g = get(); if (g !== undefined) sel.value = String(g) };
    sel.addEventListener('change', () => set(sel.value)); page.append(row); refreshers[page.dataset.tab].push(fill);
  }
  function button(page, label, fn) { const b = mk('button', { type: 'button', textContent: label }); b.addEventListener('click', () => fn(b)); page.append(b); return b }
  function heading(page, text) { page.append(mk('h3', { textContent: text })) }
  function note(page, text) { page.append(mk('div', { className: 'na', textContent: text })) }
  function addTab(id, title) {
    const page = mk('div'); page.dataset.tab = id; page.hidden = true; refreshers[id] = []; pages[id] = page;
    const b = mk('button', { type: 'button', textContent: title, role: 'tab' }); b.dataset.tab = id; b.setAttribute('aria-selected', 'false');
    b.addEventListener('click', () => showTab(id)); tabBar.append(b); panel.append(page);
    if (id !== 'ros' && id !== 'wld') { const rb = mk('button', { type: 'button', textContent: 'RESET THIS TAB TO DEFAULTS', className: 'dev-reset' }); rb.addEventListener('click', () => { if (rb.dataset.armed !== '1') { rb.dataset.armed = '1'; rb.textContent = 'CLICK AGAIN TO CONFIRM RESET'; setTimeout(() => { rb.dataset.armed = ''; rb.textContent = 'RESET THIS TAB TO DEFAULTS' }, 3500); return } rb.dataset.armed = ''; const n = resetTab(id); rb.textContent = 'RESET (' + n + ' SETTINGS)'; setTimeout(() => { rb.textContent = 'RESET THIS TAB TO DEFAULTS' }, 2000) }); page.append(rb) }
    return page;
  }
  function showTab(id) {
    current = id; for (const [k, p] of Object.entries(pages)) p.hidden = k !== id;
    tabBar.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    refreshers[id].forEach(fn => fn());
  }

  // ---- shared state helpers ---------------------------------------------------------------------------------------------------------------------------------------
  const panelPosition=()=>{const r=panel.getBoundingClientRect();return {x:Number.isFinite(parseFloat(panel.style.left))?parseFloat(panel.style.left):r.left,y:Number.isFinite(parseFloat(panel.style.top))?parseFloat(panel.style.top):r.top}};
  const saveCM = () => { const s=CM()?.settings;if(s)try{const devPanelPosition=panelPosition();s.devPanelPosition=devPanelPosition;localStorage.setItem(CM_KEY,JSON.stringify(s));localStorage.setItem('ashfall_dev_menu_position',JSON.stringify(devPanelPosition))}catch{} };
  const cmSet = key => v => { const s = CM()?.settings; if (s) { s[key] = v; saveCM() } };
  const cmGet = key => { const f = () => CM()?.settings?.[key]; f.cmKey = key; return f };
  const menuSet = () => hub?.scene.getObjectByName('COCKPIT_CINEMATIC_SET');
  const findSpot = () => { let s = null; menuSet()?.traverse(o => { if (!s && o.isSpotLight) s = o }); return s };
  const kelvinToRGB = k => { const t = k / 100; let r, g, b; r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -.1332047592); g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -.0755148492); b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; const c = v => Math.max(0, Math.min(255, v)) / 255; return [c(r), c(g), c(b)] };

  // ============================== GRAPHICS ==============================
  const gfx = addTab('gfx', 'GRAPHICS');
  heading(gfx, 'FIELD OF VIEW');
  slider(gfx, 'Main menu FOV (degrees)', 30, 100, 1, () => ST()?.menuFov ?? 35, v => window.AshfallSettings?.setValue?.('menuFov', v));
  slider(gfx, 'In-game FOV (degrees)', 30, 120, 1, () => ST()?.gameFov ?? 110, v => window.AshfallSettings?.setValue?.('gameFov', v));
  heading(gfx, 'FOG');
  slider(gfx, 'Menu fog density', 0, .4, .005, cmGet('fogDensity'), cmSet('fogDensity'));
  slider(gfx, 'Yard fog density (exp²)', .001, .08, .001, () => hub?.scene.fog?.density, v => { if (hub?.scene.fog) hub.scene.fog.density = v });
  let fogHex = '#111914';
  gfx.append(mk('label', { className: 'sel' }, [document.createTextNode('Fog / scatter colour'), (() => { const i = mk('input', { type: 'color', value: fogHex }); i.addEventListener('input', () => { fogHex = i.value; hub?.scene.fog?.color.set(i.value) }); return i })()]));
  note(gfx, 'Height falloff: not available (the game uses exponential distance fog, no height fog).');
  heading(gfx, 'GLOBAL LIGHTING');
  slider(gfx, 'Menu global intensity', 0, 3, .05, cmGet('globalIntensity'), cmSet('globalIntensity'));
  slider(gfx, 'Ambient (hemisphere) light', 0, 3, .05, () => hub?.menuLights?.[3]?.intensity, v => { if (hub?.menuLights?.[3]) hub.menuLights[3].intensity = v });
  slider(gfx, 'Exposure (tone-mapped scenes)', .2, 3, .05, () => hub?.renderer.toneMappingExposure, v => { if (hub) hub.renderer.toneMappingExposure = v });
  heading(gfx, 'OVERHEAD SPOTLIGHT');
  slider(gfx, 'Brightness', 0, 500, 1, cmGet('spotIntensity'), cmSet('spotIntensity'));
  slider(gfx, 'Attenuation radius', 5, 80, .5, () => findSpot()?.distance || undefined, v => { const s = findSpot(); if (s) s.distance = v });
  slider(gfx, 'Colour temperature (K)', 2000, 9000, 100, () => 4200, v => { const s = findSpot(), [r, g, b] = kelvinToRGB(v); s?.color.setRGB(r, g, b) });
  heading(gfx, 'COCKPIT NEON SIGN');
  slider(gfx, 'Emission multiplier', 0, 180, 1, cmGet('signIntensity'), cmSet('signIntensity'));
  slider(gfx, 'Flicker rate (0 = steady)', 0, 5, .1, () => CM()?.flickerRate ?? 1, v => { const c = CM(); if (c) c.flickerRate = v });
  heading(gfx, 'POST-PROCESSING');
  toggle(gfx, 'Reflective floor (ray-traced-style mirror)', () => (CM()?.settings?.wetness || 0) > 0, on => cmSet('wetness')(on ? .72 : 0));
  slider(gfx, 'Floor reflection strength', 0, 1, .01, cmGet('wetness'), cmSet('wetness'));
  select(gfx, 'Effects quality', [['low', 'LOW'], ['medium', 'MEDIUM'], ['high', 'HIGH']], cmGet('quality'), cmSet('quality'));
  const post = { bloom: 0, chroma: 0, blur: 0 };
  let postFilter = null;
  function applyPost() {
    if (inLocker) { if (hub) hub.renderer.domElement.style.filter = ''; return }
    const canvas = hub?.renderer.domElement; if (!canvas) return;
    if (!post.bloom && !post.chroma && !post.blur) { canvas.style.filter = ''; return }
    if (!postFilter) {
      document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="dev-post" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/><feOffset in="r" dx="0" result="ro"/><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/><feOffset in="b" dx="0" result="bo"/><feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen" result="ca"/><feGaussianBlur in="ca" stdDeviation="6" result="soft"/><feComponentTransfer in="soft" result="bright"><feFuncR type="linear" slope="2.2" intercept="-.9"/><feFuncG type="linear" slope="2.2" intercept="-.9"/><feFuncB type="linear" slope="2.2" intercept="-.9"/></feComponentTransfer><feComposite in="ca" in2="bright" operator="arithmetic" k1="0" k2="1" k3="0" k4="0" result="out"/></filter></svg>');
      postFilter = document.querySelector('#dev-post');
    }
    const [ro, bo] = postFilter.querySelectorAll('feOffset'), px = post.chroma * 6;
    ro.setAttribute('dx', String(-px)); bo.setAttribute('dx', String(px));
    const k3 = postFilter.querySelector('feComposite'); k3.setAttribute('k3', String(post.bloom)); postFilter.querySelector('feGaussianBlur').setAttribute('stdDeviation', String(4 + post.bloom * 4));
    canvas.style.filter = `url(#dev-post)${post.blur ? ` blur(${post.blur}px)` : ''}`;
  }
  slider(gfx, 'Bloom intensity (screen-space approximation)', 0, 1.5, .05, () => post.bloom, v => { post.bloom = v; applyPost() });
  slider(gfx, 'Chromatic aberration (px split)', 0, 1, .02, () => post.chroma, v => { post.chroma = v; applyPost() });
  slider(gfx, 'Motion blur (full-frame blur approximation, px)', 0, 4, .1, () => post.blur, v => { post.blur = v; applyPost() });
  button(gfx, 'EXPORT 8K MENU STILL', () => CM()?.export8K?.());
  button(gfx, 'RESET GRAPHICS', () => { try { localStorage.removeItem(CM_KEY) } catch {} location.reload() });

  // ============================== AUDIO ==============================
  const aud = addTab('aud', 'AUDIO');
  heading(aud, 'COCKPIT RADIO');
  const musicButton = button(aud, '[ MUTE ALL AUDIO ]', () => {
    if (!window.AshfallSettings?.setValue) { note(aud, 'Audio settings are not ready yet.'); return }
    window.AshfallSettings.setValue('mute', !ST()?.mute);
    syncMusicButton();
  });
  function syncMusicButton() {
    const muted = !!ST()?.mute;
    musicButton.textContent = muted ? '[ UNMUTE ALL AUDIO ]' : '[ MUTE ALL AUDIO ]';
    musicButton.setAttribute('aria-pressed', String(muted));
    musicButton.disabled = !window.AshfallSettings?.setValue;
  }
  refreshers.aud.push(syncMusicButton);
  window.AshfallSettings?.subscribe?.((snapshot, key) => { if (key === 'initial' || key === 'mute') syncMusicButton() });
  note(aud, 'Mutes music, ambience, and sound effects. The saved setting is restored on restart.');
  // ============================== PLAYER ==============================
  const ply = addTab('ply', 'PLAYER');
  const groups = [
    ['CAMERA', [['offsetX', 'Shoulder offset X', -3, 3, .05], ['offsetY', 'Shoulder offset Y', -1, 2.5, .05], ['offsetZ', 'Shoulder offset Z', -2, 2, .05], ['pivotHeight', 'Pivot height', .8, 2.5, .05], ['distance', 'Boom / arm distance', .5, 10, .05], ['smoothing', 'Camera smoothing', 1, 40, 1]]],
    ['MOUSE', [['sensitivity', 'Mouse look sensitivity', .1, 4, .05], ['lookSmoothing', 'Look smoothing (0 = raw)', 0, 60, 1], ['pitchMin', 'Pitch down limit (deg)', -85, 0, 1], ['pitchMax', 'Pitch up limit (deg)', 0, 85, 1], ['turnRate', 'Body turn rate', 1, 40, .5], ['idleDeadzone', 'Idle turn dead zone (deg)', 0, 180, 5]]],
    ['MOVEMENT', [['walkSpeed', 'Walk speed', 1, 14, .1], ['sprintSpeed', 'Sprint speed', 1, 14, .1], ['accel', 'Acceleration', 1, 120, 1], ['decel', 'Deceleration (ground friction)', 1, 120, 1]]],
    ['ANIMATION', [['strideWalk', 'Stride length, walk', .8, 5, .05], ['strideRun', 'Stride length, run', .8, 6, .05], ['strideStrafe', 'Strafe stride ratio', .3, 1, .05], ['legLift', 'Leg lift', 0, .5, .01], ['lean', 'Body lean', 0, 3, .05]]]
  ];
  for (const [title, rows] of groups) {
    heading(ply, title);
    for (const [key, label, min, max, step] of rows) slider(ply, label, min, max, step, () => tuning[key], v => { tuning[key] = v; TP?.save() });
    if (title === 'MOVEMENT') slider(ply, 'Sprint multiplier (sprint ÷ walk)', 1, 3, .05, () => tuning.sprintSpeed / tuning.walkSpeed, v => { tuning.sprintSpeed = Math.min(14, tuning.walkSpeed * v); TP?.save() });
  }
  note(ply, 'Not available: Jump height, gravity scale and fly / no-clip mode. Movement is flat-ground and server-authoritative in this game, so there is no jump or collision-bypass to tweak.');
  const tel = mk('pre'); ply.append(tel);
  refreshers.ply.push(() => {});
  button(ply, 'RESET DEFAULTS', () => { TP?.reset(); refreshers.ply.forEach(fn => fn()) });
  button(ply, 'COPY JSON', () => navigator.clipboard?.writeText(JSON.stringify(tuning, null, 2)).catch(() => {}));

  // ============================== ROSTER ==============================
  const ros = addTab('ros', 'ROSTER');
  const RC = () => window.AshfallRobotCustomizer, CH = () => window.AshfallChickens, SS = () => window.AshfallSkinSets;
  const robotNames = () => (window.AshfallModels?.names || []).map((n, i) => [String(i), `${i} · ${n}`]);
  const chickenNames = () => (window.AshfallChickenModels?.names || []).map((n, i) => [String(i), `${i} · ${n}`]);
  const skinNames = (extra = true) => [['-1', 'NONE / BASE MODEL'], ...(extra ? [['-2', 'MIXED MODULES']] : []), ...(SS()?.defs || []).map((d, i) => d ? [String(i), `${i} · ${d.name}`] : null).filter(Boolean)];
  const commitRobot = () => { RC()?.persist?.() };
  heading(ros, 'LIVE SWAP · ROBOT (main podium)');
  select(ros, 'Robot base model', robotNames, () => RC()?.profile?.model ?? '0', v => { const p = RC()?.profile; if (p) { p.model = v; delete p.parts; commitRobot() } });
  select(ros, 'Robot skin set', () => skinNames(), () => RC()?.profile?.skinSet ?? '-1', v => { const p = RC()?.profile; if (!p) return; if (v === '-2') p.skinModules = window.AshfallCharacterRandomizer?.moduleMap?.() || {}; else delete p.skinModules; p.skinSet = v; commitRobot() });
  heading(ros, 'LIVE SWAP · CHICKEN PET');
  select(ros, 'Chicken base model', chickenNames, () => CH()?.selected?.visual?.model ?? '0', v => { const b = CH()?.selected; if (b) CH().setVisual(b.id, 'model', v) });
  select(ros, 'Chicken skin set', () => skinNames(), () => CH()?.selected?.visual?.skinSet ?? -1, v => { const b = CH()?.selected; if (!b) return; if (v === '-2') b.visual.skinModules = window.AshfallCharacterRandomizer?.moduleMap?.() || {}; else delete b.visual.skinModules; CH().setVisual(b.id, 'skinSet', Number(v)) });
  note(ros, 'The game has 5 robot models, 5 chicken models and 10 skin sets (the old 25-style library was replaced).');
  heading(ros, 'ANIMATION FORCING');
  const AR = () => window.AshfallAnimationRig;
  const animChoices = () => [['', 'AUTO (menu/locomotion controls)'], ['robot-proc', 'ROBOT · rigid mechanical idle (procedural)'], ['robot-clip', 'ROBOT · Mixamo clip robot_menu_idle' + (AR()?.status?.().robot_menu_idle === 'ready' ? '' : ' (not imported)')], ['chicken-proc', 'CHICKEN · peck / look-around idle (procedural)'], ['chicken-clip', 'CHICKEN · Mixamo reference clip' + (AR()?.status?.().chicken_menu_idle_ref === 'ready' ? '' : ' (not imported)')], ['stop', 'STOP · rest pose']];
  let forced = '';
  select(ros, 'Force animation', animChoices, () => forced, v => {
    if (inLocker) { forced = ''; return }
    forced = v; const ar = AR(); if (!ar || !hub) return;
    ar.stop(hub.robot); ar.stop(hub.bird);
    if (v === 'robot-proc') ar.play(hub.robot, 'robot'); else if (v === 'robot-clip') ar.play(hub.robot, 'robot', { clip: 'robot_menu_idle' });
    else if (v === 'chicken-proc') ar.play(hub.bird, 'chicken'); else if (v === 'chicken-clip') ar.play(hub.bird, 'chicken', { clip: 'chicken_menu_idle_ref' });
  });
  heading(ros, 'HITBOXES');
  const hb = { box: false, capsule: false, wire: false }, helpers = [], wireSaved = new Map();
  const setBoxes = on => { helpers.splice(0).forEach(h => { h.parent?.remove(h); h.geometry?.dispose() }); if (on && T && hub) for (const o of [hub.robot, hub.bird]) { const h = new T.BoxHelper(o, 0x66ff99); h.userData.target = o; hub.scene.add(h); helpers.push(h) } };
  let capsules = [];
  const setCapsules = on => { capsules.splice(0).forEach(c => { c.parent?.remove(c); c.geometry.dispose(); c.material.dispose() }); if (on && T && hub) for (const [o, r, h] of [[hub.robot, .5, 1.7], [hub.bird, .7, 1.2]]) { const c = new T.Mesh(new T.CapsuleGeometry(r, h, 4, 12), new T.MeshBasicMaterial({ color: 0xffd34d, wireframe: true, depthTest: false, transparent: true, opacity: .7 })); c.position.y = h / 2 + r; c.renderOrder = 999; o.add(c); capsules.push(c) } };
  const setWire = on => { if (!hub) return; for (const o of [hub.robot, hub.bird]) o.traverse(m => { if (!m.isMesh || capsules.includes(m)) return; const mats = Array.isArray(m.material) ? m.material : [m.material]; for (const mt of mats) { if (on) { if (!wireSaved.has(mt)) wireSaved.set(mt, mt.wireframe); mt.wireframe = true } else if (wireSaved.has(mt)) { mt.wireframe = wireSaved.get(mt); wireSaved.delete(mt) } } }); if (!on) wireSaved.clear() };
  toggle(ros, 'Bounding boxes over live characters', () => hb.box, on => { hb.box = on && !inLocker; setBoxes(hb.box) });
  toggle(ros, 'Collision capsules', () => hb.capsule, on => { hb.capsule = on && !inLocker; setCapsules(hb.capsule) });
  toggle(ros, 'Wireframe meshes', () => hb.wire, on => { hb.wire = on && !inLocker; setWire(hb.wire) });
  /* Customisation isolation: the locker avatar must never inherit dev overrides. On entering the locker everything the dev menu applied to the live characters (wireframe, helpers, capsules, forced animation, screen filter) is purged, and those controls ignore input until the locker closes. Only profile IDs (model / skin set / palette) cross the boundary. */
  function purgeForLocker() {
    hb.box = hb.capsule = hb.wire = false; setBoxes(false); setCapsules(false); setWire(false); forced = '';
    if (hub) for (const o of [hub.robot, hub.bird]) { AR()?.stop(o); o.traverse(m => { if (!m.isMesh) return; for (const mt of Array.isArray(m.material) ? m.material : [m.material]) if (mt?.wireframe) mt.wireframe = false }) }
    applyPost(); refreshers.ros.forEach(fn => fn());
  }
  note(ros, 'In the character locker these overrides are purged and ignored, so the customisation model always starts clean.');
  note(ros, 'Wireframe covers meshes present when toggled; toggle it off and on after swapping models.');

  // ============================== MENU BOT ==============================
  const bot=addTab('bot','MENU BOT');heading(bot,'MAIN MENU CHARACTER MODEL');
  slider(bot,'Model opacity (%)',0,100,1,()=>((CM()?.settings?.modelOpacity??1)*100),v=>{CM()?.setModelOpacity?.(v/100);saveCM()});
  slider(bot,'Auto-rotate speed (deg/s)',0,180,1,()=>CM()?.settings?.autoRotateSpeed??0,v=>{CM()?.setAutoRotateSpeed?.(v);saveCM()});
  note(bot,'0 = off; higher values spin the live avatar faster. Manual dragging temporarily pauses auto-rotation.');
  note(bot,'100% with hologram intensity at 0 is fully solid. Opacity and hologram only affect the menu podium model.');
  heading(bot,'HOLOGRAM LAYER');
  slider(bot,'Hologram strength',0,100,1,()=>((CM()?.settings?.holoIntensity??0)*100),v=>{CM()?.setHoloOption?.('holoIntensity',v/100);saveCM()});
  slider(bot,'Scanline strength',0,100,1,()=>((CM()?.settings?.holoScanlines??0)*100),v=>{CM()?.setHoloOption?.('holoScanlines',v/100);saveCM()});
  slider(bot,'Radar sweep speed',0,100,1,()=>((CM()?.settings?.holoScanSpeed??0)*100),v=>{CM()?.setHoloOption?.('holoScanSpeed',v/100);saveCM()});
  slider(bot,'Scanline distortion',0,100,1,()=>((CM()?.settings?.holoDistortion??0)*100),v=>{CM()?.setHoloOption?.('holoDistortion',v/100);saveCM()});
  slider(bot,'Glow intensity',0,200,1,()=>((CM()?.settings?.holoGlow??0)*100),v=>{CM()?.setHoloOption?.('holoGlow',v/100);saveCM()});
  slider(bot,'Flicker intensity',0,100,1,()=>((CM()?.settings?.holoFlicker??0)*100),v=>{CM()?.setHoloOption?.('holoFlicker',v/100);saveCM()});
  const holoColor=mk('input',{type:'color',value:CM()?.settings?.holoColor||'#70ffc6'}),holoColorRow=mk('label',{className:'sel'},[document.createTextNode('Hologram tint'),holoColor]);holoColor.addEventListener('input',()=>{CM()?.setHoloOption?.('holoColor',holoColor.value);saveCM()});bot.append(holoColorRow);refreshers.bot.push(()=>{holoColor.value=CM()?.settings?.holoColor||'#70ffc6'});
  button(bot,'RESET MENU BOT',()=>{CM()?.setModelOpacity?.(1);CM()?.setAutoRotateSpeed?.(0);CM()?.setHoloOption?.('holoIntensity',.55);CM()?.setHoloOption?.('holoScanlines',.32);CM()?.setHoloOption?.('holoGlow',.8);CM()?.setHoloOption?.('holoFlicker',.15);CM()?.setHoloOption?.('holoScanSpeed',.42);CM()?.setHoloOption?.('holoDistortion',.38);CM()?.setHoloOption?.('holoColor','#70ffc6');saveCM();refreshers.bot.forEach(fn=>fn())});

  // ============================== RAVE ==============================
  const rv = addTab('rave', 'RAVE'), RS = () => window.AshfallRaveShow, rcfg = k => () => RS()?.cfg[k], rset = k => v => { if (RS()) RS().cfg[k] = v };
  heading(rv, 'SHOW');
  toggle(rv, 'Light show + music enabled', rcfg('enabled'), on => { const r = RS(); if (!r) return; r.cfg.enabled = on; if (!on) r.stop(); else if (window.AshfallEntrySequence?.state && window.AshfallEntrySequence.state !== 'MENU') r.start() });
  select(rv, 'Visual preset', () => [['auto', 'AUTO (changes with the song)'], ...Object.entries(RS()?.PRESETS || {}).map(([k, p]) => [k, p.name])], () => RS()?.cfg.preset ?? 'auto', v => { const r = RS(); if (r) { r.cfg.preset = v; r.skipPreset() } });
  heading(rv, 'AUDIO');
  slider(rv, 'Audio input sensitivity', .3, 3, .05, rcfg('sensitivity'), rset('sensitivity'));
  slider(rv, 'Blackout threshold (higher = lights go out sooner when the music drops)', .15, .85, .01, rcfg('blackoutThreshold'), rset('blackoutThreshold'));
  heading(rv, 'LASERS');
  toggle(rv, 'Lasers', rcfg('lasers'), rset('lasers')); slider(rv, 'Laser count', 0, 28, 1, rcfg('laserCount'), rset('laserCount')); slider(rv, 'Laser thickness', .01, .2, .005, rcfg('laserThickness'), rset('laserThickness'));
  toggle(rv, 'Floor colour bursts', rcfg('floor'), rset('floor'));
  heading(rv, 'MOVING HEADS');
  toggle(rv, 'Moving-head beams', rcfg('beams'), rset('beams')); slider(rv, 'Beam brightness', 0, 2, .05, rcfg('beamBrightness'), rset('beamBrightness'));
  heading(rv, 'COLOUR + STROBE');
  slider(rv, 'Master colour speed', .1, 4, .05, rcfg('colorSpeed'), rset('colorSpeed'));
  toggle(rv, 'Rare strobes (only on extreme transients)', rcfg('strobes'), rset('strobes')); slider(rv, 'Strobe intensity', 0, 1, .02, rcfg('strobe'), rset('strobe')); slider(rv, 'Strobe rarity (higher = rarer)', 0, 1, .01, rcfg('strobeRarity'), rset('strobeRarity')); button(rv, 'TEST STROBE', () => RS()?.flashStrobe());
  heading(rv, 'SYNC + FREQUENCY ASSIGNMENT');
  slider(rv, 'Picture-to-sound delay in ms (raise if lights hit BEFORE the sound, lower if after)', 0, 400, 5, () => RS()?.cfg.syncMs ?? (RS()?.stats?.sync || 0), v => { if (RS()) RS().cfg.syncMs = v });
  toggle(rv, 'Reshuffle which lights hear which frequency on every section', rcfg('diversify'), rset('diversify')); button(rv, 'RESHUFFLE LIGHTS NOW', () => RS()?.reshuffle());
  heading(rv, 'TEMPO STROBE SECTIONS');
  toggle(rv, 'Strobe sections (14 strobe fixtures in 5 zones, speed follows the music tempo)', rcfg('strobeBanks'), rset('strobeBanks'));
  slider(rv, 'Strobe section frequency (how often a section starts)', 0, 1, .02, rcfg('strobeDensity'), rset('strobeDensity'));
  slider(rv, 'Strobe max speed (flashes per second)', 1, 10, .5, rcfg('strobeMaxHz'), rset('strobeMaxHz'));
  slider(rv, 'Strobe brightness', 0, 2, .05, rcfg('strobeBright'), rset('strobeBright'));
  slider(rv, 'Flash length (fraction of each cycle)', .1, .6, .02, rcfg('strobeDuty'), rset('strobeDuty'));
  button(rv, 'START A STROBE SECTION NOW', () => RS()?.strobeNow());
  note(rv, 'Fast music strobes fast, slow music strobes slow (a multiple of the beat). Fast flashing can trigger photosensitive seizures: keep the max speed low unless you know you are fine, and the Reduce motion setting turns all strobes off.');
  heading(rv, 'SMOKE CANNONS');
  toggle(rv, 'Smoke blasts on huge drops', rcfg('smoke'), rset('smoke')); slider(rv, 'Smoke amount', .3, 2, .05, rcfg('smokeAmount'), rset('smokeAmount')); button(rv, 'FIRE SMOKE NOW', () => RS()?.fireSmoke());
  button(rv, 'NEXT PRESET', () => RS()?.skipPreset()); button(rv, 'RESTART TRACK', () => RS()?.restart());
  const rvStat = mk('pre'); rv.append(rvStat);
  setInterval(() => { if (panel.hidden || current !== 'rave') return; const s = RS()?.stats || {}; rvStat.textContent = `SECTION ${s.section ?? '-'}  PRESET ${s.preset ?? '-'}
PATTERN ${s.pattern ?? '-'}  BPM ${s.bpm ?? '-'}  T ${s.time ?? 0}s
BASS ${s.bass ?? 0}  MID ${s.mid ?? 0}  HIGH ${s.high ?? 0}\nBANDS (SUB KICK LOW MID UPPER PRES HATS AIR) HITS ${s.bands ?? ''}\nSTROBE ${s.strobe ?? 'off'}\nLIGHTS ${s.gate ?? 0} (loudness vs peak ${s.rel ?? 0})  BEATS ${s.beats ?? 0}
${s.playing ? 'PLAYING' : 'stopped (starts when you enter the game)'}` }, 250);

  // ============================== WORLD ==============================
  // ============================== REFLECTIONS ==============================
  const rfl = addTab('rfl', 'REFLECTIONS'), FRc = () => window.AshfallFloorReflect, rfc = k => () => FRc()?.cfg[k], rfs = k => v => { if (FRc()) FRc().cfg[k] = v };
  heading(rfl, 'WET FLOOR REFLECTIONS (real-time mirror pass, the closest WebGL gets to ray tracing)');
  toggle(rfl, 'Floor reflections on', rfc('enabled'), rfs('enabled'));
  slider(rfl, 'Reflection strength', 0, 1.5, .02, rfc('strength'), rfs('strength'));
  slider(rfl, 'Puddle coverage (0 = dry floor)', 0, 1, .02, rfc('puddles'), rfs('puddles'));
  slider(rfl, 'Dry-floor sheen', 0, .6, .01, rfc('sheen'), rfs('sheen'));
  slider(rfl, 'Blur (rough concrete)', 0, 4, .05, rfc('blur'), rfs('blur'));
  toggle(rfl, 'Water ripples', rfc('ripples'), rfs('ripples'));
  heading(rfl, 'QUALITY / COST');
  slider(rfl, 'Reflection resolution (fraction of the screen)', .15, 1, .05, rfc('resScale'), rfs('resScale'));
  slider(rfl, 'Reflection updates per second', 5, 60, 1, rfc('rate'), rfs('rate'));
  note(rfl, 'Each update draws the scene once more from a mirrored camera, so keep the resolution low. The adaptive quality option in PERFORMANCE lowers this automatically when the frame rate drops.');
  // ============================== PERFORMANCE ==============================
  const prf = addTab('prf', 'PERFORMANCE'), PF = () => window.AshfallPerf, pfc = k => () => PF()?.cfg[k], pfs = k => v => { if (PF()) PF().cfg[k] = v };
  heading(prf, 'AUTOMATIC QUALITY (HOLD THE FRAME RATE)');
  toggle(prf, 'Adaptive quality: lower the load automatically when the frame rate dips', pfc('adaptive'), pfs('adaptive')); slider(prf, 'Target frames per second', 30, 144, 1, pfc('targetFps'), pfs('targetFps'));
  note(prf, 'Steps: 1 cheaper floor reflection, 2 reflection off, 3 render at 80%, 4 render at 65% and no bloom. It climbs back up slowly when there is headroom.');
  const gstat = mk('pre', { className: 'na' }); prf.append(gstat); refreshers.prf.push(() => { const g = PF()?.gov; gstat.textContent = g ? 'Frame time ' + g.ema.toFixed(1) + ' ms  |  ' + g.status : '' });
  heading(prf, 'DRAW CALLS');
  toggle(prf, 'Merge static scenery into big meshes (fewer draw calls)', pfc('merge'), pfs('merge'));
  slider(prf, 'Seconds to wait after loading before merging', 2, 30, 1, pfc('mergeDelay'), pfs('mergeDelay'));
  note(prf, 'Meshes that never move and share a material are baked together a few seconds after the scene loads. Switching this off restores the originals instantly.');
  const mstat = mk('pre', { className: 'na' }); prf.append(mstat); refreshers.prf.push(() => { const s = PF()?.stats; mstat.textContent = s ? 'Merge: ' + s.state : '' });
  heading(prf, 'HIDDEN WORK');
  toggle(prf, 'Skip the pit-monitor camera feed while its arena is hidden', pfc('skipHiddenFeeds'), pfs('skipHiddenFeeds'));
  toggle(prf, 'Switch off the old hub world lights in the lobby (back on in the customizer)', pfc('cullHubLights'), pfs('cullHubLights'));
  heading(prf, 'CROWD');
  toggle(prf, 'Cap the crowd animation update rate', pfc('crowdThrottle'), pfs('crowdThrottle')); slider(prf, 'Crowd animation updates per second', 4, 60, 1, pfc('crowdHz'), pfs('crowdHz'));
  heading(prf, 'MEASURE');
  const pout = mk('pre', { className: 'na' }); prf.append(pout);
  button(prf, 'MEASURE DRAW CALLS / TRIANGLES / LIGHTS NOW', () => { const m = PF()?.measure(); pout.textContent = m ? 'draw calls ' + m.calls + '   triangles ' + m.triangles + '   lights ' + m.lights + '   geometries ' + m.geometries + '   textures ' + m.textures + '   shader programs ' + m.programs + '   CPU submit ' + m.cpuMs + ' ms' : '' });
  // ============================== CRT / POST ==============================
  const crt = addTab('crt', 'CRT / POST'), FXC = () => window.AshfallPSX?.fx, fcf = k => () => FXC()?.[k], fst = k => v => { if (FXC()) FXC()[k] = v };
  heading(crt, 'MASTER');
  toggle(crt, 'Cinematic post effects on (works with or without the PSX look)', fcf('master'), fst('master'));
  note(crt, 'One extra full-screen pass. If the frame rate drops, switch off Bloom first. With the PSX look on and "keep signs crisp" enabled, the neon signs / boards are drawn after this pass and so skip CRT, grain and bloom.');
  heading(crt, 'CRT SCREEN');
  toggle(crt, 'Screen curvature (barrel distortion)', fcf('crt'), fst('crt')); slider(crt, 'Curvature amount', 0, .4, .01, fcf('curvature'), fst('curvature'));
  slider(crt, 'Whole-view zoom (crop black edges)', 1, 1.6, .01, fcf('zoom'), fst('zoom'));
  toggle(crt, 'Show black edge lines / bars', fcf('edgeMask'), fst('edgeMask'));
  note(crt, 'Zoom enlarges the complete 3D view around its centre. Turn off the edge mask to fill curved corners, or turn it on to show the black frame.');
  toggle(crt, 'Scanlines', fcf('scanlines'), fst('scanlines')); slider(crt, 'Scanline strength', 0, 1, .02, fcf('scanStrength'), fst('scanStrength')); slider(crt, 'Scanline size (screen pixels per line)', .5, 4, .1, fcf('scanSize'), fst('scanSize'));
  heading(crt, 'CHROMATIC ABERRATION');
  toggle(crt, 'RGB colour fringing toward the edges', fcf('chroma'), fst('chroma')); slider(crt, 'Fringe amount', 0, .02, .0005, fcf('chromaAmount'), fst('chromaAmount'));
  heading(crt, 'SELECTIVE BLOOM');
  toggle(crt, 'Bloom (only bright things glow: neon, eyes, lasers)', fcf('bloom'), fst('bloom')); slider(crt, 'Bloom strength', 0, 3, .05, fcf('bloomStrength'), fst('bloomStrength')); slider(crt, 'Bloom threshold (higher = only the brightest)', .2, 3, .05, fcf('bloomThreshold'), fst('bloomThreshold')); slider(crt, 'Bloom spread', .5, 3, .05, fcf('bloomRadius'), fst('bloomRadius'));
  heading(crt, 'FILM GRAIN + VIGNETTE');
  toggle(crt, 'Animated film grain', fcf('grain'), fst('grain')); slider(crt, 'Grain amount', 0, .3, .005, fcf('grainAmount'), fst('grainAmount'));
  toggle(crt, 'Vignette (dark screen edges)', fcf('vignette'), fst('vignette')); slider(crt, 'Vignette amount', 0, 1, .02, fcf('vignetteAmount'), fst('vignetteAmount'));
  // ============================== LIGHT ==============================
  const lgt = addTab('lgt', 'LIGHT'), SL = () => window.AshfallSoftLight, lcfg = k => () => SL()?.cfg[k], lset = k => v => { if (SL()) SL().cfg[k] = v };
  const CONE = [['off', 'Off (removed)'], ['soft', 'Soft (gradient, no hard edge)'], ['hard', 'Original hard cone']];
  heading(lgt, 'LIGHT CONES / BEAMS');
  select(lgt, 'Floodlight cones (overhead)', () => CONE, () => SL()?.cfg.floodCones ?? 'off', lset('floodCones'));
  select(lgt, 'Rave beams (moving heads, floor cones, stage beams)', () => CONE, () => SL()?.cfg.beamCones ?? 'soft', lset('beamCones'));
  slider(lgt, 'Soft beam brightness', 0, 4, .05, lcfg('softGain'), lset('softGain'));
  note(lgt, 'Lasers are thin tubes and are not affected. Fog density is under GRAPHICS > FOG.');
  heading(lgt, 'FLOOR LIGHT POOLS (COLOUR BLEED)');
  toggle(lgt, 'Coloured light pools on the floor', lcfg('pools'), lset('pools')); slider(lgt, 'Pool strength', 0, 3, .05, lcfg('poolStrength'), lset('poolStrength')); slider(lgt, 'Pool size', .3, 2.5, .05, lcfg('poolSize'), lset('poolSize'));
  heading(lgt, 'DUST IN THE AIR');
  toggle(lgt, 'Floating dust motes', lcfg('dust'), lset('dust')); slider(lgt, 'Dust brightness', 0, 2, .05, lcfg('dustAmount'), lset('dustAmount')); slider(lgt, 'Dust size', .02, .3, .005, lcfg('dustSize'), lset('dustSize'));
  // ============================== PSX ==============================
  const psx = addTab('psx', 'PSX'), PX = () => window.AshfallPSX, pcfg = k => () => PX()?.cfg[k], pset = k => v => { if (PX()) PX().cfg[k] = v };
  heading(psx, 'MASTER');
  toggle(psx, 'PSX / PS1 look on', pcfg('enabled'), pset('enabled'));
  note(psx, 'Off by default. The first time you switch it on, the scene materials are patched once (a short hitch is normal). Switching it off restores the normal picture.');
  select(psx, 'Preset', () => [['', 'Custom'], ['ps1', 'PS1 320x240 (4:3)'], ['ps1wide', 'PS1 look, screen shape'], ['sat', 'Saturn-ish 320x224'], ['crunch', 'Extra crunchy 160x120'], ['soft', 'Soft PSX 640x480']], () => '', v => { if (v) PX()?.preset(v) });
  const psxStat = mk('pre', { className: 'na' }); psx.append(psxStat); refreshers.psx.push(() => { psxStat.textContent = 'Status: ' + (PX()?.status ?? '') });
  toggle(psx, 'Keep neon signs, betting board, monitors and LED screens crisp (excluded from PSX)', pcfg('overlay'), pset('overlay'));
  heading(psx, 'VERTEX SNAPPING (WOBBLE)');
  toggle(psx, 'Vertex snapping on', pcfg('vertexSnap'), pset('vertexSnap')); slider(psx, 'Jitter intensity (0 = fine, 1 = PS1 grid, 2 = very chunky)', 0, 2, .05, pcfg('jitter'), pset('jitter'));
  toggle(psx, 'Snap characters', pcfg('snapCharacters'), pset('snapCharacters')); toggle(psx, 'Snap world / props / environment', pcfg('snapWorld'), pset('snapWorld'));
  heading(psx, 'AFFINE TEXTURE WARPING');
  toggle(psx, 'Affine texture mapping on', pcfg('affine'), pset('affine')); slider(psx, 'Texture warp amount', 0, 1, .02, pcfg('affineAmount'), pset('affineAmount'));
  toggle(psx, 'Warp characters', pcfg('affineCharacters'), pset('affineCharacters')); toggle(psx, 'Warp world / props / environment', pcfg('affineWorld'), pset('affineWorld'));
  heading(psx, 'LOW-RESOLUTION FRAMEBUFFER');
  toggle(psx, 'Low internal resolution (point filtered)', pcfg('lowRes'), pset('lowRes')); slider(psx, 'Internal height (pixels)', 64, 720, 8, pcfg('height'), pset('height'));
  select(psx, 'Picture shape', () => [['screen', 'Match the screen'], ['4:3', '4:3 (stretched)']], () => PX()?.cfg.aspect ?? 'screen', pset('aspect'));
  heading(psx, 'COLOUR BANDING + DITHER');
  toggle(psx, 'Colour banding (reduce colour depth)', pcfg('banding'), pset('banding')); slider(psx, 'Bits per colour channel (5 = PS1 15-bit)', 1, 8, 1, pcfg('bits'), pset('bits'));
  toggle(psx, 'Ordered dither', pcfg('dither'), pset('dither')); slider(psx, 'Dither strength', 0, 3, .05, pcfg('ditherStrength'), pset('ditherStrength'));
  select(psx, 'Dither pattern', () => [['4', '4x4 Bayer'], ['2', '2x2 checkerboard']], () => String(PX()?.cfg.ditherSize ?? 4), v => { if (PX()) PX().cfg.ditherSize = Number(v) });
  heading(psx, 'FRAME RATE');
  toggle(psx, 'Cap the 3D view frame rate (the interface stays smooth)', pcfg('capFps'), pset('capFps')); slider(psx, '3D frames per second', 5, 60, 1, pcfg('fps'), pset('fps'));
  // ============================== EYES ==============================
  const eyt = addTab('eye', 'EYES'), EF = () => window.AshfallEyeFX, ecfg = k => () => EF()?.cfg[k], eset = k => v => { if (EF()) EF().cfg[k] = v };
  heading(eyt, 'MASTER');
  toggle(eyt, 'Eye effects on (off = original eyes)', ecfg('enabled'), eset('enabled'));
  note(eyt, 'Covers the player, menu robot, lobby bots, arena chicken-bots and every other character built from the robot / chicken models.');
  button(eyt, 'RESET EYE DEFAULTS', () => { EF()?.resetDefaults?.(); refreshers.eye.forEach(fn => fn()) });
  note(eyt, 'Eye effects re-scan when a base head or modular head piece changes, so eye placement and animation stay with the selected head.');
  heading(eyt, 'BACKLIT GLOW');
  toggle(eyt, 'Eyes glow (independent backlight)', ecfg('glow'), eset('glow'));
  select(eyt, 'Glow colour', () => [['default', 'Model default (green lenses, own LCD colour)'], ['green', 'Neon green'], ['red', 'Red'], ['amber', 'Amber'], ['cyan', 'Cyan'], ['magenta', 'Magenta'], ['white', 'White'], ['cycle', 'Colour cycle']], () => EF()?.cfg.color ?? 'default', eset('color'));
  slider(eyt, 'Glow intensity', 0, 6, .05, ecfg('intensity'), eset('intensity'));
  toggle(eyt, 'Pulse', ecfg('pulse'), eset('pulse')); slider(eyt, 'Pulse frequency (Hz)', 0, 4, .05, ecfg('pulseHz'), eset('pulseHz')); slider(eyt, 'Pulse depth', 0, 1, .02, ecfg('pulseDepth'), eset('pulseDepth'));
  toggle(eyt, 'Eyes flare on the music beat', ecfg('beat'), eset('beat')); slider(eyt, 'Beat flare amount', 0, 4, .05, ecfg('beatAmount'), eset('beatAmount'));
  toggle(eyt, 'Halo (bloom around the eyes)', ecfg('halo'), eset('halo')); slider(eyt, 'Halo / bloom strength', 0, 2, .05, ecfg('haloStrength'), eset('haloStrength'));
  heading(eyt, 'BLINKING');
  toggle(eyt, 'Physical eyes blink (lids squash)', ecfg('blinkAnalog'), eset('blinkAnalog'));
  toggle(eyt, 'Digital / LCD eyes blink', ecfg('blinkDigital'), eset('blinkDigital'));
  select(eyt, 'Digital blink style', () => [['scan', 'Scanline collapse'], ['flicker', 'Pixel flicker']], () => EF()?.cfg.digitalStyle ?? 'scan', eset('digitalStyle'));
  slider(eyt, 'Shortest gap between blinks (s)', .5, 8, .1, ecfg('blinkMin'), eset('blinkMin')); slider(eyt, 'Longest gap between blinks (s)', 1, 12, .1, ecfg('blinkMax'), eset('blinkMax')); slider(eyt, 'Blink length (s)', .05, .5, .01, ecfg('blinkTime'), eset('blinkTime'));
  heading(eyt, 'MICRO-SACCADES (IDLE TWITCHES)');
  toggle(eyt, 'Eyes dart slightly while idle', ecfg('saccades'), eset('saccades')); slider(eyt, 'Saccade size', 0, 4, .05, ecfg('saccadeAmount'), eset('saccadeAmount')); slider(eyt, 'Saccade rate', .2, 4, .05, ecfg('saccadeRate'), eset('saccadeRate'));
  heading(eyt, 'REACTION STATES');
  toggle(eyt, 'Eyes flash on hit / power-up (arena fight)', ecfg('states'), eset('states')); slider(eyt, 'Flash strength', 0, 8, .1, ecfg('flashStrength'), eset('flashStrength')); slider(eyt, 'Flash length (s)', .1, 2, .05, ecfg('flashTime'), eset('flashTime'));
  button(eyt, 'TEST: HAZARD RED FLASH ON ALL EYES', () => EF()?.flashAll('hit')); button(eyt, 'TEST: POWER-UP FLASH ON ALL EYES', () => EF()?.flashAll('power'));
  heading(eyt, 'PERFORMANCE');
  slider(eyt, 'Only animate eyes closer than (m)', 10, 150, 5, ecfg('cullDistance'), eset('cullDistance'));
  const eyeStat = mk('pre', { className: 'na' }); eyt.append(eyeStat); refreshers.eye.push(() => { const s = EF()?.stats; eyeStat.textContent = s ? 'Eyes registered: ' + s.eyes + '   animating now: ' + s.active : '' });
  // ============================== NEON ==============================
  const neo = addTab('neo', 'NEON'), NF = () => window.AshfallNeonFX, ncfg = k => () => NF()?.cfg[k], nset = k => v => { if (NF()) NF().cfg[k] = v }, YF = () => window.AshfallYardDressing?.fx, YD = () => window.AshfallYardDressing, BW = () => window.AshfallBackWallNeon?.cfg;
  heading(neo, 'SIGN SPARKS');
  toggle(neo, 'Sparks from the neon signs', ncfg('enabled'), nset('enabled'));
  slider(neo, 'How often (bursts per minute, per sign)', 0, 120, 1, ncfg('rate'), nset('rate'));
  slider(neo, 'Sparks per burst (amount)', .2, 4, .05, ncfg('amount'), nset('amount'));
  slider(neo, 'Spark speed', 1, 14, .2, ncfg('speed'), nset('speed'));
  slider(neo, 'Spark gravity', 0, 25, .5, ncfg('gravity'), nset('gravity'));
  slider(neo, 'Spark lifetime (s)', .3, 3, .05, ncfg('life'), nset('life'));
  slider(neo, 'Spark size', .05, 1, .01, ncfg('size'), nset('size'));
  select(neo, 'Spark colour', () => [['sign', 'Match the sign'], ['electric', 'Electric blue-white'], ['hot', 'Hot orange'], ['white', 'White']], () => NF()?.cfg.colour ?? 'sign', nset('colour'));
  toggle(neo, 'Rooster sign throws sparks too', ncfg('rooster'), nset('rooster'));
  toggle(neo, 'Sign dips / shorts out when it sparks', ncfg('dip'), nset('dip'));
  button(neo, 'SPARK BURST NOW', () => NF()?.burst());
  heading(neo, 'SIGN FLICKER + LIGHT');
  slider(neo, 'Flicker amount (0 = steady tubes)', 0, 3, .05, () => YF()?.flicker, v => { if (YF()) YF().flicker = v });
  slider(neo, 'Sign light power (glow cast on the room)', 0, 3, .05, () => YF()?.lightScale, v => { if (YF()) YF().lightScale = v });
  heading(neo, 'ROOSTER SIGN (BACK WALL)');
  slider(neo, 'Rooster brightness', 0, 2, .05, () => BW()?.brightness, v => { if (BW()) BW().brightness = v });
  slider(neo, 'Rooster halo glow', 0, 2, .05, () => BW()?.halo, v => { if (BW()) BW().halo = v });
  // ============================== STAGE ==============================
  const stg = addTab('stg', 'STAGE'), SG = () => window.AshfallRaveStage, scfg = k => () => SG()?.cfg[k], sset = k => v => { if (SG()) SG().cfg[k] = v };
  heading(stg, 'DJ STAGE (BACK OF THE WAREHOUSE)');
  toggle(stg, 'Stage visible', scfg('enabled'), sset('enabled'));
  heading(stg, 'LED SCREENS');
  toggle(stg, 'LED screens animate (spectrum + logo)', scfg('screens'), sset('screens')); slider(stg, 'LED brightness', 0, 1.5, .05, scfg('screenBright'), sset('screenBright'));
  select(stg, 'Screen text', () => [['COCKPIT', 'COCKPIT'], ['ASHFALL', 'ASHFALL'], ['ROBO-CHICKEN', 'ROBO-CHICKEN'], ['FIGHT NIGHT', 'FIGHT NIGHT'], ['LIVE', 'LIVE']], () => SG()?.cfg.text ?? 'COCKPIT', sset('text'));
  heading(stg, 'STAGE LIGHTS');
  toggle(stg, 'Stage beams (gantry heads + floor up-lights)', scfg('beams'), sset('beams')); slider(stg, 'Stage beam brightness', 0, 2, .05, scfg('beamBright'), sset('beamBright'));
  heading(stg, 'SPEAKERS + DJ');
  toggle(stg, 'Sub-woofer cones pump on the kick', scfg('woofers'), sset('woofers')); toggle(stg, 'DJ animation', scfg('dj'), sset('dj'));
  // ============================== LOBBY ==============================
  const lob = addTab('lob', 'LOBBY FX'); heading(lob, 'SPECTATOR CROWD'); slider(lob, 'Floor crowd (cage + crown podium)', 0, 160, 1, () => YD()?.crowdSettings?.floor ?? 64, v => YD()?.setCrowdCount?.('floor', v)); slider(lob, 'Scaffold / catwalk cheerers', 0, 2000, 1, () => YD()?.crowdSettings?.scaffold ?? 18, v => YD()?.setCrowdCount?.('scaffold', v)); note(lob, 'Floor spectators gather around both the chicken cage and crown podium. Scaffold spectators spread across all gallery levels. Set either slider to 0 to clear that crowd.');
  heading(lob, 'ARENA FIGHT (CHICKEN-BOT COMBAT AI)');
  const FA = () => window.AshfallFightAI, fcfg = k => () => FA()?.cfg[k], fset = k => v => { if (FA()) FA().cfg[k] = v };
  toggle(lob, 'Fighters fight (combat AI on)', fcfg('enabled'), fset('enabled'));
  slider(lob, 'Aggression (how often they attack)', .2, 3, .05, fcfg('aggression'), fset('aggression'));
  slider(lob, 'Heavy claw lunge chance', 0, 1, .02, fcfg('heavyChance'), fset('heavyChance'));
  slider(lob, 'Block chance when a wind-up is seen', 0, 1, .02, fcfg('blockChance'), fset('blockChance'));
  slider(lob, 'Fighter movement speed', .4, 2.5, .05, fcfg('speed'), fset('speed'));
  slider(lob, 'Hit-stop on a heavy blow (ms)', 0, 150, 5, fcfg('hitStopMs'), fset('hitStopMs'));
  slider(lob, 'Impact sparks amount', 0, 3, .05, fcfg('sparks'), fset('sparks'));
  slider(lob, 'Bouncing scrap amount', 0, 3, .05, fcfg('scrap'), fset('scrap'));
  toggle(lob, 'Electric arcs on impact', fcfg('arcs'), fset('arcs'));
  toggle(lob, 'Impact sounds (metal grind + zap)', fcfg('sound'), fset('sound')); slider(lob, 'Impact sound volume', 0, 1.5, .05, fcfg('volume'), fset('volume'));
  const fightSoundButton = button(lob, '', () => { const settings = window.AshfallSettings; if (!settings?.setValue) return; settings.setValue('arenaFightSounds', !settings.state.arenaFightSounds) });
  function syncFightSoundButton() { const enabled = ST()?.arenaFightSounds !== false; fightSoundButton.textContent = enabled ? '[ MUTE ARENA FIGHT SOUNDS ]' : '[ UNMUTE ARENA FIGHT SOUNDS ]'; fightSoundButton.setAttribute('aria-pressed', String(!enabled)); fightSoundButton.disabled = !window.AshfallSettings?.setValue }
  refreshers.lob.push(syncFightSoundButton); window.AshfallSettings?.subscribe?.((snapshot, key) => { if (key === 'initial' || key === 'arenaFightSounds') syncFightSoundButton() });
  note(lob, 'Mutes only the chickens’ arena impact sounds. Music and other sound effects remain unchanged; this preference is saved across restarts.');
  button(lob, 'FORCE A HEAVY HIT', () => FA()?.forceHit(true)); button(lob, 'FORCE A LIGHT HIT', () => FA()?.forceHit(false));
  heading(lob, 'FIGHT RING');
  toggle(lob, 'Clash sparks between the two fighters', () => YF()?.clash, v => { if (YF()) YF().clash = v });
  slider(lob, 'Clash spark rate', .1, 4, .05, () => YF()?.clashRate, v => { if (YF()) YF().clashRate = v });
  heading(lob, 'REPAIR BENCH');
  toggle(lob, 'Welding sparks + flash', () => YF()?.welding, v => { if (YF()) YF().welding = v });
  note(lob, 'Rave lights, lasers, smoke cannons and strobes live in the RAVE tab; neon signs and their sparks live in NEON.');
  const wld = addTab('wld', 'WORLD');
  let scale = 1, rawLast = 0, virt = 0, lastRaw = -1, lastVirt = 0;
  const nativeRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => nativeRAF(t => { if (lastRaw !== t) { if (rawLast) virt += (t - rawLast) * scale; else virt = t; rawLast = t; lastRaw = t; lastVirt = virt } cb(lastVirt) });
  heading(wld, 'GAME SPEED');
  slider(wld, 'Time scale (animations + movement dt)', .05, 3, .05, () => scale, v => { scale = v });
  note(wld, 'The server clock and audio keep real time; the local scene, animation and camera run on scaled time.');
  heading(wld, 'PERFORMANCE');
  const fpsBox = mk('div', { id: 'dev-fps', hidden: true }); document.body.append(fpsBox);
  toggle(wld, 'FPS / frame time / memory overlay', () => !fpsBox.hidden, on => { fpsBox.hidden = !on });
  heading(wld, 'STATE');
  button(wld, 'RESET SCENE', () => { if (confirm('Reload the scene? Unsaved world position is lost; saved profile stays.')) location.reload() });
  const clear = button(wld, 'CLEAR SAVE DATA', b => {
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'CONFIRM: ERASE ALL SAVES'; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'CLEAR SAVE DATA' }, 4000); return }
    try { Object.keys(localStorage).filter(k => /^(ashfall|cockpit)_/.test(k)).forEach(k => localStorage.removeItem(k)) } catch {}
    location.reload();
  });
  note(wld, 'Clear removes every ashfall_* / cockpit_* key in this browser (profile, chickens, settings, tuning, lighting) and reloads. Server-side world data is untouched.');

  // ---- per-frame work: stats, helper updates, telemetry, forced animation ----------------------------------------------------------------------------
  let frames = 0, acc = 0, worst = 0, lastT = performance.now(), fps = 0, avg = 0, lastForce = performance.now();
  (function tick(now) {
    nativeRAF(tick);
    const d = now - lastT; lastT = now; frames++; acc += d; worst = Math.max(worst, d);
    if (acc >= 500) { fps = frames * 1000 / acc; avg = acc / frames; if (!fpsBox.hidden) { const r = hub?.renderer.info, mem = performance.memory; fpsBox.textContent = `FPS ${fps.toFixed(0)}  frame ${avg.toFixed(1)} ms (worst ${worst.toFixed(0)})\ncalls ${r?.render.calls ?? '-'}  tris ${r?.render.triangles ?? '-'}\ngeo ${r?.memory.geometries ?? '-'}  tex ${r?.memory.textures ?? '-'}` + (mem ? `\nJS heap ${(mem.usedJSHeapSize / 1048576).toFixed(0)} / ${(mem.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : '') } frames = 0; acc = 0; worst = 0 }
    { const nowIn = !!document.querySelector('[data-view="locker"]') && !document.querySelector('[data-view="locker"]').hidden || !!window.AshfallLockerStage?.active; if (nowIn !== inLocker) { inLocker = nowIn; if (inLocker) purgeForLocker(); else applyPost() } }
    helpers.forEach(h => h.update());
    if (forced && forced !== 'stop' && !CM()?.active) { const dt = Math.min(.1, (now - lastForce) / 1000), ar = AR(); if (ar && hub) { if (forced.startsWith('robot')) ar.update(hub.robot, dt, 'robot'); else ar.update(hub.bird, dt, 'chicken') } }
    lastForce = now;
    if (!panel.hidden && current === 'ply' && TP) { const l = TP.loco; tel.textContent = `STATE ${l.state}  DIR ${l.dir}\nANGLE ${l.angle.toFixed(0).padStart(4)}°  SPEED ${l.speed.toFixed(1)}\nCADENCE ${l.rate.toFixed(2)} cyc/s  STRIDE ${l.stride.toFixed(2)}\nRUN BLEND ${l.run.toFixed(2)}  MOVE ${l.weight.toFixed(2)}` }
  })(performance.now());

  const hint = mk('small', { textContent: 'Changes apply live. Camera and movement values are saved in this browser; lighting values are saved with the menu lighting preferences.' });
  panel.append(hint); document.body.append(panel); showTab('gfx');
  const devHeader=panel.querySelector('h2');let savedPanelPosition=null;try{const config=JSON.parse(localStorage.getItem(CM_KEY)||'{}');savedPanelPosition=config.devPanelPosition||JSON.parse(localStorage.getItem('ashfall_dev_menu_position')||'null')}catch{}
  if(Number.isFinite(savedPanelPosition?.x)&&Number.isFinite(savedPanelPosition?.y)){panel.style.left=savedPanelPosition.x+'px';panel.style.top=savedPanelPosition.y+'px'}
  let drag=null;function clampDevPanel(x,y){const r=panel.getBoundingClientRect(),h=devHeader.getBoundingClientRect().height;panel.style.left=Math.max(0,Math.min(innerWidth-r.width,x))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-h,y))+'px';panel.style.right='auto'}
  devHeader.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};devHeader.setPointerCapture?.(e.pointerId);panel.classList.add('is-dragging');e.preventDefault()});
  devHeader.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id)clampDevPanel(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y)});
  const finishDrag=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;panel.classList.remove('is-dragging');devHeader.releasePointerCapture?.(e.pointerId);saveCM()};devHeader.addEventListener('pointerup',finishDrag);devHeader.addEventListener('pointercancel',finishDrag);window.addEventListener('resize',()=>{if(!panel.hidden){const r=panel.getBoundingClientRect();clampDevPanel(r.left,r.top);saveCM()}});

  // Keep game hotkeys and mouse-look from reacting to typing inside the panel.
  panel.addEventListener('keydown', e => { if (e.code !== 'Digit9' && e.code !== 'Numpad9') e.stopPropagation() });
  panel.addEventListener('keyup', e => e.stopPropagation());

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(DEV_KEY) || '{}') || {} } catch {}
  function collect() { const o = {}; for (const c of persisted) { let v; try { v = c.get() } catch { continue } if (v === undefined || (c.kind === 'n' && !Number.isFinite(v))) continue; o[c.key] = v } return o }
  function saveAll() {
    const data = collect(); saved = data;
    try { localStorage.setItem(DEV_KEY, JSON.stringify(data)) } catch {}
    try { fetch('/api/dev-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: true }).catch(() => {}) } catch {}
  }
  let restoring = false;
  function applySaved() {
    restoring = true;
    try { if (!localStorage.getItem('ashfall_dev_sens_max')) { localStorage.setItem('ashfall_dev_sens_max', '1'); saved['rave|Audio input sensitivity'] = 3 } } catch {}
    for (const c of persisted) { if (!('def' in c)) { let v; try { v = c.get() } catch {} if (v !== undefined) c.def = v } }
    for (const c of persisted) { if (!(c.key in saved)) continue; try { c.set(saved[c.key]) } catch (e) { console.warn('[dev-menu] could not restore', c.key, e) } }
    restoring = false; refreshers[current || 'gfx']?.forEach(fn => fn());
  }
  fetch('/api/dev-settings', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(j => { if (j && Object.keys(j).length) saved = { ...saved, ...j } }).catch(() => {}).finally(() => { applySaved(); window.addEventListener('load', () => { setTimeout(applySaved, 800); setTimeout(applySaved, 2800) }); if (document.readyState === 'complete') { setTimeout(applySaved, 800); setTimeout(applySaved, 2800) } });
  window.addEventListener('pagehide', () => { if (!panel.hidden) saveAll() });

  function toggleMenu(force) {
    const open = force ?? panel.hidden;
    if (!open && !panel.hidden) saveAll();
    panel.hidden = !open;
    if (open) { document.exitPointerLock?.(); document.activeElement?.blur?.(); showTab(current || 'gfx') }
    else if (window.AshfallEntrySequence?.state === 'IN_WORLD') { try { hub.renderer.domElement.requestPointerLock?.()?.catch?.(() => {}) } catch {} }
  }
  window.addEventListener('keydown', e => {
    if (e.code !== 'Digit9' && e.code !== 'Numpad9' || e.repeat) return;

    if (e.target.closest?.('textarea,[contenteditable=true],input:not([type=range]):not([type=checkbox]):not([type=color]),select')) return;
    e.preventDefault(); e.stopImmediatePropagation(); toggleMenu();
  }, true);

  window.AshfallDevMenu = { toggle: toggleMenu, get open() { return !panel.hidden }, showTab, get timeScale() { return scale } };
})();


