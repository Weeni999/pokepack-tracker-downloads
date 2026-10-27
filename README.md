# COCKPIT / SCRAPYARD FIGHTING ROBOCOCKS

COCKPIT is a local, no-build Three.js robo-chicken pet fighting idle game set in a scrapyard pit. All wagers use in-game credits. There are no real-money purchases or payment integrations.

Run `node server.mjs` or double-click `start-preview.cmd`, then open http://127.0.0.1:4173.

## Trainer and chicken customization

The Character Locker has a top-level Robot / Chicken switch. Robot mode customizes the trainer avatar with 25 body shapes, 25 faces, 25 shoulders, 25 hand shapes, 25 boot styles, 25 hats, 10 neck chains, a six-region color editor, surface roughness, matched kit, and randomize. The trainer profile saves in `ashfall_robot_profile`.

Chicken mode customizes each owned bird with 25 body builds, 25 head/comb/beak builds, 25 wing sets, 25 leg/talon sets, and 25 tail builds. It shares the hat catalog, neck chains, and six-region color editor. Coop data saves separately in `ashfall_chickens`.

Use WASD or the arrow keys to walk the trainer around the hub.

## Game loop

- Chickens generate credits and scrap while idle. Offline income is calculated on load and capped at eight hours.
- Feed and rest birds before fights. Hunger and rest affect fight odds. Coop and income upgrades increase passive output.
- In the Pit, stake credits and one chicken against an NPC gambler and their bird. Fights play automatically, with visible odds, prep strategy, and three cooldown actions.
- The winner takes the credit pot and the loser's chicken. If a loss empties the player's coop, a guaranteed starter returns to protect against soft-locking.
- Keep, upgrade, sell, scrap, feed, and customize chickens. Shop purchases use credits or scrap only. NPC side bets have a configurable limit and a cash-out / walk-away control.

## Main files

- `index.html` — Menu, Coop, Pit, Fight, Shop, Character Locker, and Settings.
- `scene.js` — Procedural industrial hub, trainer avatar, chicken display, and controls.
- `robot-parts.js`, `robot-customizer.js`, `neck-wear.js` — Trainer modular catalog, profile editor, and swinging chains.
- `chicken-parts.js`, `chicken-customizer.js` — Chicken part catalog and per-bird appearance editor.
- `chicken-system.js` — Coop persistence, idle income, NPCs, odds, wagers, and automatic fights.
- `color-customizer.js` — Shared accessible color wheel, RGB/hex controls, palettes, and randomization.
- `settings.js` — Graphics, audio, controls, accessibility, and English/Spanish/Japanese/German preferences.
- `menu.css` — CRT terminal, scanlines, grain, and responsive screens.
- `vendor/three.min.js` — Bundled Three.js runtime; no build step or external downloads.
## Persistent world and entry

COCKPIT is a procedural Three.js scrapyard chicken-pit prototype. It keeps the robot trainer customizer and chicken customizer as separate profiles, then adds a persistent connected Yard around the existing scene.

## Run locally

Requires Node.js 20 or newer and npm. Start `start-preview.cmd` on Windows, or run `npm install` followed by `npm start`. Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The server binds to loopback only. `ws` provides the multiplayer socket; if unavailable, the client automatically drops into local mode and keeps its coop/profile data in localStorage.

Persistent server data is written atomically to `world-data/world-state.json` and is excluded from the live-reload watcher. The file is created on first server start and is intentionally not checked into source.

## Entry and world

`entry-sequence.js` animates the already loaded camera and actor transforms through MENU, TRANSITION_IN, DOORS_OPENING, WALKING, IN_WORLD and PAUSED. Hold Space to skip the cinematic. Escape opens the existing settings dialog; its Return to Menu action preserves the saved world position. Use `?dev=1` to show the entry tuning panel.

The scene graph in `world-layout.js` attaches the entry corridor, sliding blast doors, Yard, plots and arena to the existing scene. `world-server.mjs` handles signed browser sessions, checkpoints, presence, server clock events, door state and validated game intents. `local-world.js` supplies local saved-position handling and bots when the socket is unavailable.

Robot appearance remains saved in `ashfall_robot_profile`; chicken appearance and the coop are kept separately in `ashfall_chickens`. Multiplayer credits, chicken ownership, wagers and fight outcomes come from the server JSON store.
