/* MUSIC PAUSE: the = key really pauses the music everywhere (main menu and in game): the rave track and the radio / ambient song stop where they are, and pressing = again
   carries on from the same spot. A pause is a real pause, not a mute, and it survives going in and out of the game until you press = again. */
(() => {
'use strict';
const S = { paused: false, holdNext: true, radioHeld: false }, was = { rave: false, radio: false };
const rave = () => window.AshfallRaveShow, radio = () => window.AshfallMediaPlayer;
const radioPlaying = () => { const d = radio()?.player?.diagnostics; return !!d && !d.paused };
let toast = null, timer = 0;
function say(text) {
  if (!toast) { toast = document.createElement('div'); toast.setAttribute('role', 'status'); toast.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:60;padding:8px 16px;border:1px solid #39ff6a;background:rgba(2,10,6,.88);color:#8dffb0;font:700 13px monospace;letter-spacing:.12em;pointer-events:none;opacity:0;transition:opacity .2s'; document.body.append(toast) }
  toast.textContent = text; toast.style.opacity = '1'; clearTimeout(timer); timer = setTimeout(() => { toast.style.opacity = '0' }, 1600);
}
function pause() {
  const r = rave(); was.rave = !!r?.audio && !r.audio.paused; was.radio = radioPlaying(); S.paused = true;
  try { if (was.rave) r.audio.pause() } catch {} try { if (was.radio) radio().pause() } catch {}
  say('MUSIC PAUSED   ( = to resume )');
}
function resume() {
  S.paused = false; S.radioHeld = false; const r = rave();
  try { if (r?.pendingStart) { r.pendingStart = false; r.start() } else if (was.rave) r.audio.play().catch(() => {}) } catch {}
  try { if (was.radio && !r?.playing) radio().play() } catch {}
  was.rave = was.radio = false; say('MUSIC PLAYING');
}
// entering the game starts with the music paused: the rave track waits (pendingStart) until = is pressed; the menu radio is paused for the game
function enterPaused() {
  S.holdNext = false; S.paused = true; was.rave = was.radio = false; S.radioHeld = radioPlaying();
  try { if (S.radioHeld) radio().pause() } catch {}
  say('MUSIC OFF   ( press = to play )');
}
document.addEventListener('ashfall-entry-state', e => {
  if (e.detail?.state !== 'MENU') return;
  const r = rave(); S.holdNext = true; S.paused = false; if (r) r.pendingStart = false;
  try { if (S.radioHeld) radio().play() } catch {} S.radioHeld = false;
});
function toggle() { S.paused ? resume() : pause() }
// In the game only one song may play: the rave track. While it is paused (or playing) the menu radio must stay stopped, even if the browser lets it start late after the first click.
setInterval(() => {
  const E = window.AshfallEntrySequence; if (!E || E.state === 'MENU') return;
  if (radioPlaying()) { S.radioHeld = true; try { radio().pause() } catch {} }
}, 250);
window.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.key !== '=' && e.code !== 'Equal') return;
  if (e.target?.closest?.('input:not([type=range]),textarea,select,[contenteditable=true]')) return;
  e.preventDefault(); toggle();
}, true);
window.AshfallMusicPause = Object.assign(S, { toggle, pause, resume, enterPaused });
})();
