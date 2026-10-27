"""Offline Mixamo FBX -> Ashfall runtime clip converter.

Run:  blender -b -P tools/mixamo_retarget.py -- --clip robot_menu_idle [--target-leg-length 0.9]
Reads  assets/animations/manifest.json + tools/bone_aliases.json
Writes assets/animations/retargeted/<id>.json and updates the manifest entry. Source FBX files are only read.

Method: for every mapped bone, the rotation delta from rest pose is computed in ARMATURE space (cumulative, so it does not depend on
Mixamo's local bone axes), expressed once in Three.js axes (Blender Z-up/-Y-forward -> Y-up/+Z-forward). The runtime converts the
cumulative deltas to local deltas for the Ashfall pivots (whose rest frames are axis-aligned). Bones are matched by explicit alias
table + boneOverrides only, never by index. Any validation failure aborts with a non-zero exit and no output file.
"""
import sys, os, json, math, hashlib, argparse
try:
    import bpy
    from mathutils import Quaternion, Matrix
except ImportError:
    sys.exit("Run inside Blender: blender -b -P tools/mixamo_retarget.py -- --clip <id>")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser(); ap.add_argument("--clip", required=True); ap.add_argument("--target-leg-length", type=float, default=0.9)
ap.add_argument("--fps", type=float, default=30.0); ap.add_argument("--drift-tol", type=float, default=0.15)
args = ap.parse_args(argv)

def fail(msg):
    print("[CONVERT-FAIL]", msg); sys.exit(2)

man_path = os.path.join(ROOT, "assets/animations/manifest.json")
man = json.load(open(man_path)); clip = next((c for c in man["clips"] if c["id"] == args.clip), None)
if not clip: fail("clip id not in manifest: " + args.clip)
amap = json.load(open(os.path.join(ROOT, "tools/bone_aliases.json")))
src = os.path.join(ROOT, clip["sourceFile"])
if not os.path.isfile(src): fail("missing source FBX (download it from Mixamo, see assets/animations/README.md): " + clip["sourceFile"])
sha = hashlib.sha256(open(src, "rb").read()).hexdigest()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=False, global_scale=1.0)   # unit scale handled below, exactly once
arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
if len(arms) != 1: fail("expected exactly 1 armature, found %d" % len(arms))
arm = arms[0]; act = arm.animation_data.action if arm.animation_data else None
if not act: fail("armature has no action")
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
if f1 <= f0: fail("zero-length frame range")
src_fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
if abs(src_fps - args.fps) > .5: print("[warn] frame-rate mismatch: source %.2f vs target %.2f (resampling by time)" % (src_fps, args.fps))

def strip(n):
    for p in amap["prefixes"]:
        if p and n.startswith(p): return n[len(p):]
    return n
bone_for = {}
for sem, names in amap["aliases"].items():
    ov = amap["boneOverrides"].get(sem)
    cands = [ov] if ov else names
    for b in arm.pose.bones:
        if strip(b.name) in cands: bone_for[sem] = b; break
missing = [s for s in amap["required"] if s not in bone_for]
if missing: fail("required bones not found (check names / boneOverrides): " + ", ".join(missing))
print("[map]", {k: v.name for k, v in bone_for.items()})

# unit normalisation exactly once: Mixamo FBX is in cm, bring to metres
unit = 0.01 if abs(arm.matrix_world.to_scale().x - 1.0) < 1e-6 and max(b.bone.length for b in arm.pose.bones) > 5 else 1.0
Rw = arm.matrix_world.to_3x3().normalized()
C = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))                        # Blender -> Three axes (proper rotation, applied once)
fps = args.fps; dur = (f1 - f0) / src_fps; n = max(2, int(round(dur * fps)) + 1)
tracks = {s: {"t": [], "q": []} for s in bone_for}; hips_pos = []
sc = bpy.context.scene
for i in range(n):
    sc.frame_set(f0 + int(round(i / (n - 1) * (f1 - f0)))); t = i / (n - 1) * dur
    for s, pb in bone_for.items():
        rest = pb.bone.matrix_local.to_3x3()
        d = Rw @ (pb.matrix.to_3x3() @ rest.inverted()) @ Rw.inverted()
        q = (C @ d @ C.inverted()).to_quaternion().normalized()
        tr = tracks[s]
        if tr["q"]:
            pw = Quaternion((tr["q"][-1], tr["q"][-4], tr["q"][-3], tr["q"][-2]))
            if q.dot(pw) < 0: q.negate()
        if not all(math.isfinite(v) for v in q) or abs(q.magnitude - 1) > 1e-3: fail("invalid quaternion on %s frame %d" % (s, i))
        tr["t"].append(round(t, 5)); tr["q"] += [round(q.x, 6), round(q.y, 6), round(q.z, 6), round(q.w, 6)]   # x,y,z,w
    hips_pos.append((arm.matrix_world @ bone_for["hips"].head) * unit)
# root drift (only meaningful for in-place clips) and leg length ratio
leg = (bone_for["thigh_l"].bone.length + bone_for["shin_l"].bone.length) * unit if "shin_l" in bone_for else 0
drift = max((hips_pos[i] - hips_pos[0]).xy.length for i in range(n))
if not clip["rootMotion"] and leg and drift > args.drift_tol * leg: print("[warn] root drift %.3f m exceeds %.0f%% of leg length: in-place export recommended" % (drift, args.drift_tol * 100))
# loop seam check
for s, tr in tracks.items():
    a = Quaternion((tr["q"][3], tr["q"][0], tr["q"][1], tr["q"][2])); b = Quaternion((tr["q"][-1], tr["q"][-4], tr["q"][-3], tr["q"][-2]))
    if clip["loop"] and a.rotation_difference(b).angle > math.radians(8): print("[warn] loop seam on %s: %.1f deg" % (s, math.degrees(a.rotation_difference(b).angle)))
out = {"schema": 1, "id": clip["id"], "fps": fps, "duration": round(dur, 5), "loop": clip["loop"], "boneMap": amap["version"], "tracks": tracks}
op = os.path.join(ROOT, clip["runtimeFile"]); os.makedirs(os.path.dirname(op), exist_ok=True); json.dump(out, open(op, "w"), separators=(",", ":"))
clip.update({"status": "ready", "duration": out["duration"], "contentHash": sha, "unitsApplied": unit, "legLengthRatio": round(args.target_leg_length / leg, 4) if leg else None})
json.dump(man, open(man_path, "w"), indent=2); print("[CONVERT-OK]", op, "frames", n)
