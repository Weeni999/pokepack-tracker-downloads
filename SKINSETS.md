# Skin sets: sockets, randomizer, QA protocol

Files: `skins-core.js` (engine, QA, randomizer, UI, logger), `skins-a.js` (sets 1-5), `skins-b.js` (sets 6-10), `models-*.js` (each rig exports `sockets`).

## Sockets (universal layout)
`head, chest, back, shoulderL/R, armL/R (forearm), thighL/R, shinL/R`. A socket is `{parent, hull}`: `parent` is the rig node that animates (hip pivot, elbow group, torso...), `hull` is an analytic shape in parent space: `{t:'ell', c, r:[x,y,z]}`, `{t:'cyl', c, r, h, axis}` or `{t:'box', c, s}`. Skins never reference a model by name; they build against the hull (`H.shell`, `H.pos`, `H.on`, `H.tether`, `U.band/arc/slab/spike`) so one definition fits all five bodies. Sockets a body does not have (the orb has no thighs/shins) are skipped. A socket may carry `fmap:[a,b]` to restrict skins to a band of a shared hull (orb head = top 40%).

## Randomizer (`AshfallSkinSets.randomizer`)
- `combos()` all valid `(model, skin)` pairs. `isValid(m,s)` rejects non-integers, null/empty, out-of-range indices and skins whose `requires` sockets the model lacks.
- `next()` pulls from a shuffled bag (no repeats until exhausted, never the same pair twice in a row), applies, runs QA with auto-fix, and quarantines + skips any pair that still fails (max 8 tries). `start(ms)` / `stop()` run it on an interval. `applyCombo(root,m,s)` refuses invalid input and returns null.
- Applying goes through the profile (`model`, `skinSet`) so look codes, the server and remote players stay in sync.

## QA pass (`qa(root,{fix,poses})`, runs automatically on every build)
1. CLIP: any piece vertex more than 2 cm inside its own hull is pushed out along the hull normal (mounts may bury 7 cm).
2. DETACHED: every mesh must connect (vertex-in-bounds graph) to something touching the hull; detached parts get a tether strut to the hull.
3. POSE: at rest, arms forward/back and both leg-stride poses, no piece may enter another socket's hull beyond what the base bodies already share (+14 cm garment thickness where hulls touch or overlap, 5 cm elsewhere). Violations are nudged away, then the piece is shrunk by 15% (twice at most). Anything left is reported and the combination is quarantined.
4. Everything is written to `AshfallSkinSets.getLog()` and the console as `[SKINQA] ...`.

## Interop checks
- `clear(root)` removes pieces, disposes geometry and skin materials, and restores every tinted base material. `audit(root)` returns any stray piece / skin material / registered state (empty = clean). All 50 combinations were built, QA'd and cleared with zero residue.
- Emissive channels live only on skin-owned materials, so nothing glows after a skin is removed. Per-skin pulse/scroll animations are registered through `S.upd` and die with the skin.

## Console helpers
`await fetch('/dev-studio.js').then(r=>r.text()).then(eval)` then `__matrix()` runs all 50 combinations on throw-away roots. `AshfallSkinSets.randomizer.next()`, `.qa(AshfallHubScene.robot)`, `.getLog()`.
