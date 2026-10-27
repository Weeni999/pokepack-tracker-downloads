/* CUSTOMIZATION / PARTS: holographic parts interface drawn over the main-menu podium.
   It replaces the look of #character-customize-overlay (legacy controls stay in the DOM, hidden) and edits the same data the game already uses:
   robot profile (AshfallRobotCustomizer.profile) and the selected chicken's visual (AshfallChickens.selected.visual).
   Slots map to real skin-module sockets (head, chest, shoulders, arms, legs, back). Rows for parts the five bodies do not have are shown as NOT FITTED, not faked. */
(() => {
'use strict';
const ov = document.getElementById('character-customize-overlay');
if (!ov) return;
const RC = () => window.AshfallRobotCustomizer, CH = () => window.AshfallChickens, SS = () => window.AshfallSkinSets, RND = () => window.AshfallCharacterRandomizer, MC = () => window.AshfallMenuCharacter;
const MODS = ['head', 'chest', 'shoulders', 'arms', 'legs', 'back'];
const ROBOT_SLOTS = [
  ['head', 'HEAD', 'Swap robotic heads, visors, antennae and sensor arrays.'],
  ['chest', 'CHEST / TORSO', 'Heavy chest plates, reactor cores and wiring harnesses.'],
  ['shoulders', 'SHOULDERS', 'Left and right pauldrons, spikes, shields and socket guards.'],
  ['arms', 'ARMS', 'Upper and lower arm servos, plating and hydraulic guards.'],
  ['legs', 'LEGS', 'Thigh guards, knee caps and calf / shin plating.'],
  ['back', 'BACK / PACK', 'Thrusters, generator packs, dangling cables and utility gear.']];
const PET_SLOTS = [
  ['body', 'BODY / CHEST', 'Select the chicken body shell and armor layout.'],
  ['head', 'HEAD / BEAK', 'Select the head, comb and beak assembly.'],
  ['wings', 'WINGS', 'Select wing panels and feather plating.'],
  ['legs', 'LEGS / TALONS', 'Select leg guards and talon assemblies.'],
  ['tail', 'TAIL', 'Select the tail fan and rear assembly.']];
const NOT_FITTED = [
  ['hands', 'GLOVES / HANDS', 'No separate hand sockets on the five base bodies yet.'],
  ['feet', 'FEET / BOOTS', 'No separate foot sockets on the five base bodies yet.'],
  ['acc', 'ACCESSORIES', 'Scrap belts, badges and extra slots are not built yet.'],
  ['decal', 'DECAL / PATTERN', 'Decal layers are not built yet.']];

let tab = 'body', subject = 'robot', baseline = null, undo = [], lastPush = 0, status = '';
const mk = (tag, props = {}, kids = []) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) k.includes('-') ? e.setAttribute(k, v) : (e[k] = v); e.append(...kids); return e };
const target = () => subject === 'chicken' ? CH()?.selected?.visual : RC()?.profile;
const mode = () => subject;

// ---- data access -----------------------------------------------------------------------------------------------------------------------------------
function modulesOf(t) {
  if (t?.skinModules && typeof t.skinModules === 'object') return { ...t.skinModules };
  const s = Number(t?.skinSet);
  return Object.fromEntries(MODS.map(k => [k, Number.isInteger(s) && s >= 0 ? s : -1]));
}
function commit() {
  if (subject === 'chicken') { const b = CH()?.selected; if (b) { CH().save?.(); window.AshfallChickenModels?.apply?.(window.AshfallHubScene?.bird, b.visual, b.id) } }
  else { RC()?.persist?.(); const p = RC()?.profile, robot = window.AshfallHubScene?.robot; if (p && robot) { window.AshfallModels?.apply?.(robot, p); window.AshfallCharacterRandomizer?.applyPalette?.(robot, p) } }
}
function snap() { return JSON.stringify({ robot: { ...(RC()?.profile || {}) }, chicken: CH()?.selected ? { id: CH().selected.id, visual: { ...CH().selected.visual } } : null }) }
function restore(s) {
  const d = JSON.parse(s), p = RC()?.profile;
  if (p && d.robot) { for (const k of Object.keys(p)) delete p[k]; Object.assign(p, d.robot); RC().persist() }
  if (d.chicken) { const b = CH()?.selected; if (b && b.id === d.chicken.id) { for (const k of Object.keys(b.visual)) delete b.visual[k]; Object.assign(b.visual, d.chicken.visual); CH().save?.() } }
}
function pushUndo(force) { const now = performance.now(); if (!force && now - lastPush < 700) return; lastPush = now; const s = snap(); if (undo[undo.length - 1] !== s) undo.push(s); if (undo.length > 60) undo.shift(); syncButtons() }
const note = text => { status = text; const el = ov.querySelector('[data-pu-status]'); if (el) el.textContent = text };

// ---- wireframe preview ----------------------------------------------------------------------------------------------------------------------------------
const ROBOT_SVG = `<svg viewBox="0 0 120 220" aria-hidden="true"><g class="wf" fill="none" stroke="currentColor" stroke-width="1.2">
<g data-slot="head"><rect x="46" y="8" width="28" height="26" rx="5"/><path d="M52 8l-3-7M68 8l3-7M46 22h28M52 16h6M62 16h6"/></g>
<g data-slot="chest"><rect x="38" y="40" width="44" height="50" rx="4"/><path d="M38 56h44M46 64h28M46 72h28M60 40v50"/><circle cx="60" cy="52" r="4"/></g>
<g data-slot="shoulders"><circle cx="28" cy="46" r="9"/><circle cx="92" cy="46" r="9"/><path d="M20 40l-5-6M100 40l5-6"/></g>
<g data-slot="arms"><rect x="18" y="56" width="12" height="34" rx="4"/><rect x="90" y="56" width="12" height="34" rx="4"/><rect x="16" y="92" width="14" height="32" rx="4"/><rect x="90" y="92" width="14" height="32" rx="4"/></g>
<g data-slot="back"><rect x="34" y="42" width="52" height="46" rx="4" stroke-dasharray="3 3"/><path d="M40 90v10M80 90v10"/></g>
<g data-slot="legs"><rect x="40" y="96" width="16" height="48" rx="4"/><rect x="64" y="96" width="16" height="48" rx="4"/><rect x="40" y="146" width="16" height="48" rx="4"/><rect x="64" y="146" width="16" height="48" rx="4"/><circle cx="48" cy="145" r="5"/><circle cx="72" cy="145" r="5"/></g>
<g data-slot="hands"><rect x="16" y="126" width="14" height="10" rx="3" stroke-dasharray="2 2"/><rect x="90" y="126" width="14" height="10" rx="3" stroke-dasharray="2 2"/></g>
<g data-slot="feet"><path d="M36 196h24v10H34zM60 196h24l2 10H60z" stroke-dasharray="2 2"/></g></g></svg>`;
const PET_SVG = `<svg viewBox="0 0 120 220" aria-hidden="true"><g class="wf" fill="none" stroke="currentColor" stroke-width="1.2">
<g data-slot="head"><circle cx="60" cy="40" r="18"/><path d="M52 24l4-10 4 8 4-8 4 10M60 44l14 6-14 4"/></g>
<g data-slot="body"><ellipse cx="60" cy="102" rx="34" ry="42"/><path d="M34 90h52M36 110h48M42 126h36"/></g>
<g data-slot="wings"><circle cx="30" cy="84" r="7"/><circle cx="90" cy="84" r="7"/><path d="M26 86c-18 14-18 40-4 56M94 86c18 14 18 40 4 56"/></g>
<g data-slot="tail"><path d="M60 142c-6 18-24 26-34 24M60 142c6 18 24 26 34 24M60 142v34"/></g>
<g data-slot="legs"><path d="M48 142v42M72 142v42M40 188h18M72 188h18"/></g></g></svg>`;

// ---- building blocks -------------------------------------------------------------------------------------------------------------------------------------
function slotRow([key, title, desc]) {
  const t = target(), mods = modulesOf(t), defs = SS()?.defs || [], max = Math.max(0, defs.length - 1);
  const row = mk('div', { className: 'pu-row' }); row.dataset.slot = key;
  const label = mk('div', { className: 'pu-label' }, [mk('b', { textContent: `[ ${title} ]` }), mk('span', { textContent: desc })]);
  const val = mk('output', { className: 'pu-val' });
  const range = mk('input', { type: 'range', min: 0, max, step: 1, 'aria-label': title + ' style' });
  const box = mk('input', { type: 'checkbox', 'aria-label': title + ' equipped' });
  const show = () => { const m = modulesOf(target()), v = Number(m[key]); box.checked = v >= 0; range.disabled = !(v >= 0); range.value = v >= 0 ? v : (Number(range.dataset.last) || 0); val.textContent = v >= 0 ? (defs[v]?.name || `STYLE ${v}`).toUpperCase() : 'EMPTY' };
  const set = v => { const tt = target(); if (!tt) return; pushUndo(); const m = modulesOf(tt); m[key] = v; tt.skinModules = m; tt.skinSet = -2; commit(); show() };
  range.addEventListener('input', () => { range.dataset.last = range.value; set(Number(range.value)) });
  box.addEventListener('change', () => set(box.checked ? Number(range.dataset.last) || 0 : -1));
  row.addEventListener('pointerenter', () => hl(key)); row.addEventListener('pointerleave', () => hl(null)); row.addEventListener('focusin', () => hl(key)); row.addEventListener('focusout', () => hl(null));
  row.append(label, mk('div', { className: 'pu-ctl' }, [range, val]), box); show(); return row;
}
function petSlotRow([key, title, desc]) {
  const catalog = window.AshfallChickenParts?.names?.[key] || [], row = mk('div', { className: 'pu-row pu-pet-slot' });
  row.dataset.slot = key;
  const label = mk('div', { className: 'pu-label' }, [mk('b', { textContent: `[ ${title} ]` }), mk('span', { textContent: desc })]);
  const val = mk('output', { className: 'pu-val' });
  const range = mk('input', { type: 'range', min: 0, max: Math.max(0, catalog.length - 1), step: 1, 'aria-label': `${title} part` });
  const show = () => { const visual = CH()?.selected?.visual, index = Math.max(0, Math.min(catalog.length - 1, Number(visual?.[key]) || 0)); range.value = String(index); val.textContent = `${index + 1} / ${catalog[index] || 'UNAVAILABLE'}`.toUpperCase(); range.disabled = !catalog.length };
  range.addEventListener('input', () => { const bird = CH()?.selected; if (!bird || !catalog.length) return; pushUndo(); const index = Number(range.value); CH().setVisual(bird.id, key, String(index)); window.AshfallChickenModels?.apply?.(window.AshfallHubScene?.bird, bird.visual, bird.id); val.textContent = `${index + 1} / ${catalog[index] || 'UNAVAILABLE'}`.toUpperCase() });
  row.addEventListener('pointerenter', () => hl(key)); row.addEventListener('pointerleave', () => hl(null)); row.addEventListener('focusin', () => hl(key)); row.addEventListener('focusout', () => hl(null));
  row.append(label, mk('div', { className: 'pu-ctl' }, [range, val]), mk('span')); show(); return row;
}
function naRow([key, title, desc]) {
  const row = mk('div', { className: 'pu-row pu-na' }); row.dataset.slot = key;
  row.append(mk('div', { className: 'pu-label' }, [mk('b', { textContent: `[ ${title} ]` }), mk('span', { textContent: desc })]), mk('div', { className: 'pu-ctl' }, [mk('output', { className: 'pu-val', textContent: 'NOT FITTED' })]), mk('span'));
  row.addEventListener('pointerenter', () => hl(key)); row.addEventListener('pointerleave', () => hl(null)); return row;
}
function pick(label, options, get, set) {
  const sel = mk('select', { 'aria-label': label }), wrap = mk('label', { className: 'pu-pick' }, [mk('span', { textContent: label }), sel]);
  sel.replaceChildren(...options.map(([v, t]) => new Option(t, v))); sel.value = String(get());
  sel.addEventListener('change', () => { pushUndo(true); set(sel.value); render() }); return wrap;
}
function hl(slot) { ov.querySelectorAll('.pu-figure [data-slot]').forEach(g => g.classList.toggle('on', g.dataset.slot === slot)) }

// ---- tabs --------------------------------------------------------------------------------------------------------------------------------------------------------------
function basePartsBlock() {
  const p = RC()?.profile, names = window.AshfallModels?.names || [], sel = window.AshfallModels?.selection?.(p) || {}, out = [mk('h3', { textContent: '[ BASE PARTS ]' })];
  const opts = names.map((n, i) => [String(i), `${i} · ${n}`]);
  for (const [k, label] of [['head', 'Head from'], ['torso', 'Torso from'], ['armL', 'Left arm from'], ['armR', 'Right arm from'], ['legL', 'Left leg from'], ['legR', 'Right leg from']]) out.push(pick(label, opts, () => sel[k], v => { if (!p) return; const cur = window.AshfallModels.selection(p); p.parts = Object.fromEntries(Object.entries(cur).map(([kk, vv]) => [kk, String(vv)])); p.parts[k] = v; RC().persist() }));
  out.push(mk('p', { className: 'pu-help', textContent: 'Mix the head, torso, each arm and each leg from any base model. The orb keeps its own dome head, a donor leg set replaces its wheels, and the barrel hauler has no head.' }));
  return out;
}
function bodyTab(list) { return (tab === 'body' ? basePartsBlock() : []).concat(list.map(slotRow), tab === 'body' ? NOT_FITTED.map(naRow) : []) }
function finishTab() {
  const out = [], pet = subject === 'chicken', t = pet ? CH()?.selected?.visual : RC()?.profile, defs = SS()?.defs || [], models = window.AshfallModels?.names || [];
  if (pet) {
    out.push(mk('h3', { textContent: '[ CHICKEN PAINT / FINISH ]' }));
    const host = mk('div', { className: 'pu-color' }); out.push(host);
    const wear = mk('label', { className: 'pu-pick' }, [mk('span', { textContent: 'SURFACE ROUGHNESS / WEAR' }), mk('input', { type: 'range', min: 0, max: 100, step: 1, 'aria-label': 'Chicken surface roughness' })]);
    const slider = wear.querySelector('input'); slider.value = Number(t?.wear) || 0; slider.addEventListener('input', () => { const b = CH()?.selected; if (b) { pushUndo(); CH().setVisual(b.id, 'wear', Number(slider.value)) } }); out.push(wear);
    queueMicrotask(() => { try { const live = new Proxy({}, { get: (_, k) => CH()?.selected?.visual?.[k], set: (_, k, x) => { const v = CH()?.selected?.visual; if (v) v[k] = x; return true }, has: (_, k) => k in (CH()?.selected?.visual || {}), ownKeys: () => Reflect.ownKeys(CH()?.selected?.visual || {}), getOwnPropertyDescriptor: (_, k) => ({ value: CH()?.selected?.visual?.[k], writable: true, enumerable: true, configurable: true }) }); window.AshfallColors?.mount(host, live, () => { pushUndo(); commit() }) } catch (e) { host.textContent = 'Colour editor unavailable.'; console.warn('[parts-ui]', e) } });
    out.push(mk('p', { className: 'pu-help', textContent: 'Paint changes apply to the selected coop chicken and save with ashfall_chickens.' }));
    return out;
  }
  out.push(mk('h3', { textContent: '[ BASE MODEL ]' }), pick('Chassis', models.map((n, i) => [String(i), `${i} · ${n}`]), () => t?.model ?? '0', v => { t.model = v; delete t.parts; RC().persist() }));
  out.push(mk('h3', { textContent: '[ SKINS / MATERIALS ]' }), pick('Full skin preset', [['-1', 'NONE / BASE MODEL'], ...defs.map((d, i) => d ? [String(i), `${i} · ${d.name}`] : null).filter(Boolean)], () => t?.skinModules ? '-1' : (t?.skinSet ?? '-1'), v => { if (!t) return; delete t.skinModules; t.skinSet = v; RC().persist() }));
  out.push(mk('h3', { textContent: '[ COLOR / EMISSIVE ]' }));
  const host = mk('div', { className: 'pu-color' }); out.push(host);
  queueMicrotask(() => { try { const live = pet ? new Proxy({}, { get: (_, k) => CH()?.selected?.visual?.[k], set: (_, k, x) => { const v = CH()?.selected?.visual; if (v) v[k] = x; return true }, has: (_, k) => k in (CH()?.selected?.visual || {}), ownKeys: () => Reflect.ownKeys(CH()?.selected?.visual || {}), getOwnPropertyDescriptor: (_, k) => ({ value: CH()?.selected?.visual?.[k], writable: true, enumerable: true, configurable: true }) }) : t; window.AshfallColors?.mount(host, live, () => { pushUndo(); commit() }) } catch (e) { host.textContent = 'Colour editor unavailable.'; console.warn('[parts-ui]', e) } });
  out.push(mk('p', { className: 'pu-help', textContent: 'Decal / pattern layers are not built yet.' }));
  return out;
}
function petTab() {
  const b = CH()?.selected, names = window.AshfallChickenModels?.names || [], out = [];
  out.push(mk('h3', { textContent: '[ PET / FOLLOWER ]' }));
  const chickens = CH()?.data?.chickens || [];
  out.push(pick('Coop chicken', chickens.map(c => [c.id, `${c.name} · ${c.rarity}`]), () => b?.id || chickens[0]?.id || '', v => { const selector = document.getElementById('locker-chicken'); if (selector) { selector.value = v; selector.dispatchEvent(new Event('change', { bubbles: true })) } }));
  const modelRange = mk('input', { type: 'range', min: 0, max: Math.max(0, names.length - 1), step: 1, 'aria-label': 'Chicken base model' }), modelOutput = mk('output', { className: 'pu-val' });
  const setModelLabel = () => { const i = Number(CH()?.selected?.visual?.model) || 0; modelRange.value = String(i); modelOutput.textContent = `${i + 1} / ${(names[i] || 'MODEL').toUpperCase()}` };
  modelRange.addEventListener('input', () => { const bird = CH()?.selected; if (!bird) return; pushUndo(); CH().setVisual(bird.id, 'model', modelRange.value); window.AshfallChickenModels?.apply?.(window.AshfallHubScene?.bird, bird.visual, bird.id); modelOutput.textContent = `${Number(modelRange.value) + 1} / ${(names[Number(modelRange.value)] || 'MODEL').toUpperCase()}` }); setModelLabel();
  out.push(mk('div', { className: 'pu-row pu-pet-model' }, [mk('div', { className: 'pu-label' }, [mk('b', { textContent: '[ BASE CHICKEN MODEL ]' }), mk('span', { textContent: 'Swap the whole fighter chassis between all five cyber-poultry models.' })]), mk('div', { className: 'pu-ctl' }, [modelRange, modelOutput]), mk('span')]));
  out.push(pick('Full skin preset', [['-1', 'NONE / BASE MODEL'], ...(SS()?.defs || []).map((d, i) => d ? [String(i), `${i} · ${d.name}`] : null).filter(Boolean)], () => b?.visual?.skinModules ? '-1' : (b?.visual?.skinSet ?? '-1'), v => { if (!b) return; delete b.visual.skinModules; CH().setVisual(b.id, 'skinSet', Number(v)) }));
  out.push(mk('p', { className: 'pu-help', textContent: 'Part sliders directly swap the selected chicken’s body, head, wings, legs and tail. Changes save to your coop.' }));
  return out.concat(PET_SLOTS.map(petSlotRow));
}

// ---- shell ----------------------------------------------------------------------------------------------------------------------------------------------------------------
const root = mk('div', { id: 'parts-ui' });
ov.append(root); ov.classList.add('parts-ui');
function render() {
  if (tab === 'body') subject = 'robot'; else if (tab === 'pet') subject = 'chicken';
  const tt = subject; if ((window.AshfallCustomizerMode || 'robot') !== tt) document.querySelector(`[data-customizer-mode="${tt}"]`)?.click();
  const rail = mk('nav', { className: 'pu-rail', 'aria-label': 'Customization sections' }, [['body', 'BODY', '◉'], ['pet', 'PET', '♜'], ['finish', 'FINISH', '◈']].map(([id, name, icon]) => { const b = mk('button', { type: 'button', title: name, 'aria-label': name, 'aria-pressed': String(tab === id) }, [mk('i', { textContent: icon }), mk('small', { textContent: name })]); b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); tab = id; render() }); return b }));
  const head = mk('header', { className: 'pu-head' }, [mk('h2', { textContent: 'CUSTOMIZATION / PARTS' }), mk('div', {}, [mk('button', { type: 'button', 'aria-label': 'Save and close', textContent: '✕', onclick: () => finish(true) })])]);
  const rows = tab === 'body' ? bodyTab(ROBOT_SLOTS) : tab === 'pet' ? petTab() : finishTab();
  const list = mk('div', { className: 'pu-list' }, rows);
  const t = target(), modelName = subject === 'chicken' ? window.AshfallChickenModels?.names?.[Number(t?.model)] : window.AshfallModels?.names?.[Number(t?.model)];
  const side = mk('aside', { className: 'pu-side' }, [mk('div', { className: 'pu-figure', innerHTML: subject === 'chicken' ? PET_SVG : ROBOT_SVG }), mk('p', { className: 'pu-model', textContent: (modelName || '—').toUpperCase() }), (() => { const b = mk('button', { type: 'button', className: 'pu-random', textContent: 'RANDOMIZE ALL' }); b.addEventListener('click', () => { pushUndo(true); const ok = RND()?.randomizeAll(mode()); note(ok ? 'RANDOM CONFIGURATION BUILT.' : 'NOTHING TO RANDOMIZE.'); render() }); return b })()]);
  const foot = mk('footer', { className: 'pu-foot' }, [
    mk('button', { type: 'button', 'data-pu-undo': '', textContent: '[ UNDO ]', onclick: doUndo }),
    mk('button', { type: 'button', className: 'pu-save', textContent: '[ SAVE CHANGES ]', onclick: () => finish(true) }),
    mk('button', { type: 'button', textContent: '[ CANCEL ]', onclick: () => finish(false) }),
    mk('output', { 'data-pu-status': '', 'aria-live': 'polite', textContent: status })]);
  root.replaceChildren(rail, mk('div', { className: 'pu-main' }, [head, mk('div', { className: 'pu-body' }, [list, side]), foot]));
  syncButtons();
}
function syncButtons() { const b = ov.querySelector('[data-pu-undo]'); if (b) b.disabled = !undo.length }
function doUndo() { const s = undo.pop(); if (!s) return; restore(s); note('UNDONE.'); render() }
function finish(save) {
  if (save) { baseline = snap(); note('CHANGES SAVED.'); window.AshfallChickens?.notify?.('LOADOUT SAVED.') }
  else if (baseline) { restore(baseline); window.AshfallChickens?.notify?.('CHANGES CANCELLED.') }
  undo = []; MC()?.close?.();
}

// open / close detection (menu-character toggles overlay.hidden)
let wasHidden = ov.hidden;
function onVisibility() {
  if (ov.hidden === wasHidden) return; wasHidden = ov.hidden;
  if (!ov.hidden) { baseline = snap(); undo = []; status = ''; subject = window.AshfallCustomizerMode === 'chicken' ? 'chicken' : 'robot'; tab = subject === 'chicken' ? 'pet' : 'body'; render() }
}
new MutationObserver(onVisibility).observe(ov, { attributes: true, attributeFilter: ['hidden'] });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden && ov.classList.contains('parts-ui') && !window.AshfallSettings?.isOpen && !window.AshfallDevMenu?.open) { e.preventDefault(); e.stopImmediatePropagation(); finish(false) } }, true);
window.AshfallPartsUI = { render, undo: doUndo, get tab() { return tab } };
if (!ov.hidden) onVisibility();
})();
