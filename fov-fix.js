/* FOV FIX: the in-game field of view (Settings / dev menu > In-game FOV) is applied every frame while you are in the world. Before this, it was only applied when a setting changed,
   so after a restart (or after entering the lobby from the menu) the camera kept the menu's narrower lens instead of your saved value. */
(() => {
'use strict';
const hub = window.AshfallHubScene, MM = window.AshfallMainMenu;
if (!hub?.camera || !MM || typeof MM.update !== 'function') return;
const orig = MM.update, IN = ['IN_WORLD', 'DOORS_OPENING', 'WALKING'];
MM.update = function (dt, t) {
  const r = orig.call(this, dt, t), E = window.AshfallEntrySequence, S = window.AshfallSettings?.state;
  if (E && S && !E.ownsCamera && !window.AshfallCinematicMenu?.active && !window.AshfallLockerStage?.active && (IN.includes(E.state) || (E.state === 'PAUSED' && IN.includes(E.previousState)))) {
    const want = S.gameFov || 110, c = hub.camera;
    if (Math.abs(c.fov - want) > .01) { c.fov = want; c.updateProjectionMatrix() }
  }
  return r;
};
})();
