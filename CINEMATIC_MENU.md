# COCKPIT live cinematic menu

The reference photograph is no longer rendered as the menu background. The active menu uses the existing Three.js renderer, camera and scene, with a separate procedural set and display robot. Gameplay avatars, saved customizations, chickens and world data are unchanged.

## Files
- cinematic-set.js: physical woven fence, posts, cages, floor, debris, crates, cables, raised stencil COCKPIT lettering, chicken emblem,  podium for the equipped gameplay robot, podium, lights and hologram.
- cinematic-fx.js: live planar reflection render target and depth-limited ray-marched fog; adjustable quality; renderer-state restoration and failure fallback.
- cinematic-menu.js: scene visibility lifecycle, 35mm camera, blended AnimationMixer idle, projected accessible menu buttons, settings and lobby connections, local lighting preferences and 8K PNG capture.
- cinematic-menu.css: clean menu layout, projected control focus states, lighting panel and media visibility.
- index.html: loads these modules instead of the older main-menu and static menu-reference modules.
- lobby-entry.js: returning to the menu targets the new camera framing.

The old main-menu.js, menu-reference.js/css and reference image remain on disk for recovery, but are not loaded.

## Controls
Click the COCKPIT sign to enter the Yard. The hologram opens existing Options or invokes the existing browser exit action (browsers may refuse to close tabs they did not create). Tab and Enter work on menu buttons.

9 (top row or numpad) or Shift+L opens the developer panel. LIGHTING holds global light intensity, spotlight brightness, sign light, volumetric fog density, wetness and effects quality. MENU BOT holds an opacity slider for the menu character, from transparent to fully solid. The value persists for the menu; the live gameplay robot’s original material settings are restored when entering the Yard. Shift+R reveals/hides the existing media and radio widgets without changing the saved visibility preference. The lighting panel has an optional 7680 x 4320 PNG still export; large captures depend on GPU and memory limits. Runtime resolution remains controlled by the existing graphics settings.

Reduce-motion freezes idle/dust/fog animation and light modulation. Disabling flicker removes sign modulation. Options pauses the animated backdrop. Scene visibility and camera projection are restored on leaving the menu.

## Rendering scope and validation
This is a procedural interpretation of the supplied composition, not a claim of exact photographic reconstruction. Reflections are planar raster render-to-texture, not hardware ray tracing. Floor detail combines displaced geometry and procedural material maps; contact shadows use soft decals plus real spotlight shadow mapping, not full-scene SSAO. Fog uses a light-field approximation and scene depth, not physically complete multiple scattering. Holographic text and material textures are procedural canvas textures on live geometry; the scene is not a flat picture.

JavaScript syntax and VM tests using bundled Three.js r160 passed: finite geometry, raised lettering, sign projection, effect disabling, renderer-state restoration and successful retry after a simulated reflection failure, menu/options/start/return lifecycle, hidden-object restoration and projected controls. GPU shader compilation, final appearance, actual PNG download and performance have not been visually verified: browser access to the local game was blocked in this session.


## Updated scene and material setup

1. Geometry: the lower rectangular frame is no longer constructed. The single upper sign group is scaled 1.25 in X and Y. Its projected button follows its world-space dimensions automatically. Fence strands, structural posts, debris, cables and displaced floor remain live mesh geometry.
2. Neon: scratched plating uses a standard physically based material with a procedural emission map. The developer panel exposes Neon flicker amount from 0 to 0.8 (default 0.12). At zero the sign is steady. At stronger settings, brief randomized dips are capped so the neon never turns off. The brightness multiplier drives emission, the sign point light, floor bounce, halo and fog lighting. Reduced motion or disabled flicker forces steady illumination. The hologram has an independent subtle modulation so a sign dropout never obscures its controls.
3. Fog and light: the existing depth-aware fog is lit by green and warm light fields. The warm spotlight now points vertically down. Global intensity multiplies scene lights, and spotlight brightness applies on top of that multiplier. Reflection passes see those same live lights. Fog density also scales fallback distance fog. These are browser approximations, not Unreal Lumen or Unity HDRP volumes.
4. Robot: named torso, head and arm pivots receive an eight-second looping AnimationClip through AnimationMixer, with a 0.6-second fade-in. Feet remain planted while the torso breathes, shifts and scans. A restrained emissive metal ring outlines the podium base. No external skeletal model or Mixamo motion was supplied; this implementation uses an authored rigid-joint clip and does not claim imported Mixamo animation. A future imported skeleton needs explicit retargeting and root-motion removal before replacement.
5. UI: the projected hologram remains in the lower-left scene with scanlines and emitter rays. DOM hit regions track its geometry for mouse and keyboard access.
6. The menu moves the actual live trainer robot onto the podium while the menu is open, then returns that same object to its saved world transform on entry. This keeps its equipped model, materials, skins, and animation updates intact and avoids duplicate or ghost copies. The depth-aware fog reduces density near its surface for readability.
7. Developer controls: 9 toggles this menu only while the cinematic menu is active. In gameplay, the original camera/movement debug overlay keeps that key. Values persist under ashfall_cinematic_menu_v1 and Reset restores defaults. Inputs ignore key repeat, modified 9 shortcuts and text editing.

Checks for this update passed with bundled Three.js: enlarged sign/no lower-frame creation, top-row/numpad toggles, AnimationMixer track binding, reduced-motion pause, zero/global/spotlight multipliers and flicker amount bounds and steady mode. Visual browser/GPU verification remains unavailable in this session.
