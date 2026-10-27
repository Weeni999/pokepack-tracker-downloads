# Animation pipeline (Mixamo -> Ashfall)

Runtime: `animation-rig.js` (`window.AshfallAnimationRig`). Without a converted clip it plays a built-in procedural idle, so the game never depends on these files.

## Manual Mixamo checklist (official site only)
1. Open https://www.mixamo.com/#/?page=1&type=Motion%2CMotionPack and sign in yourself. Do not script the site or its private endpoints.
2. Robot: pick a low-motion, weighty standing idle. Preview it on a character. Download **FBX Binary, Without Skin, 30 fps, In Place on**. Save as `assets/animations/mixamo/source/robot_menu_idle.fbx`.
3. Chicken (timing reference only; Mixamo is humanoid/biped, the chicken is NOT auto-rigged): pick a bipedal idle / looking-around. Same export settings. Save as `assets/animations/mixamo/source/chicken_menu_idle_ref.fbx`.
4. Record the clip's Mixamo page URL in `manifest.json` `sourceUrl`.
5. Convert (needs Blender 3.6+; not bundled):
   `blender -b -P tools/mixamo_retarget.py -- --clip robot_menu_idle`
   Output: `assets/animations/retargeted/<id>.json`, the manifest entry is updated (duration, hash, status `ready`). Source FBX files are never modified.
6. Reload the game. Confirm bone names printed by the converter match `tools/bone_aliases.json` before trusting a clip; add overrides to `boneOverrides` in that file if not.

## Runtime clip format
`{schema,id,fps,duration,loop,tracks:{<semantic bone>:{t:[sec...],q:[x,y,z,w,...]}}}` where `q` is the rotation delta from the source rest pose, expressed in the target bone's local frame. Translation tracks are not exported (root motion is policy-disabled for menu idles).
