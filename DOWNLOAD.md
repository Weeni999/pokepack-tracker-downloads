# COCKPIT Game Download

This is the browser game source package. It uses procedural Three.js assets and has no build step.

## Run on Windows

1. Install Node.js 20 or newer.
2. Extract this ZIP.
3. Double-click `start-preview.cmd`. It installs the small WebSocket dependency if needed and starts the local game server.
4. Open http://127.0.0.1:4173 in your browser.

You can also run `npm install` followed by `npm start` in this folder.

## Included / omitted

The source, procedural assets, and bundled Three.js runtime are included. Generated saves, `node_modules`, and reference art are excluded. User-provided commercial music tracks are not redistributed in this public download. Put your own licensed MP3 in `audio/` and update `playlist.json` if you want local radio playback.

Game saves stay local in the browser or are created under `world-data/` when you run the server.
