/* Music is opt-in each time the game starts. Press = to toggle it in the menu or in the Yard. */
(() => {
'use strict';
let enabled = false;
const player = () => window.AshfallMediaPlayer;
function setEnabled(value) {
  enabled = !!value;
  const media = player();
  if (!media) return enabled;
  if (enabled) {
    media.setMuted?.(false);
    media.play?.();
  } else {
    media.pause?.();
    media.setMuted?.(true);
  }
  return enabled;
}
function toggle() { return setEnabled(!enabled) }
function onKey(event) {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.code !== 'Equal' && event.key !== '=') return;
  if (event.target?.matches?.('input,textarea,select,[contenteditable=true]')) return;
  event.preventDefault();
  toggle();
}
// Force the radio quiet on every fresh load, even if it was enabled last session.
setEnabled(false);
window.addEventListener('keydown', onKey);
window.AshfallAmbientMusic = { start: () => setEnabled(true), enable: () => setEnabled(true), disable: () => setEnabled(false), toggle, setEnabled, get enabled() { return enabled }, get playing() { return !!player()?.player?.diagnostics && !player().player.diagnostics.paused && !player().player.diagnostics.muted } };
})();
