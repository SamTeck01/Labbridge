#!/usr/bin/env bash
# Rebuild every lab asset and compress it (meshopt geometry, webp textures).
set -e
cd "$(dirname "$0")/../.."
# dr-curie.glb comes from dr_curie.py + the Mixamo FBX (not in the repo)
for s in lab_room microscope titration_rig physics_bench analytical_bench lab_furniture; do
  python3 tools/blender/$s.py > /dev/null 2>&1 || true   # bpy may segfault on exit after a successful export
done
for f in public/models/*.glb; do
  npx --yes @gltf-transform/cli optimize "$f" "$f" --compress meshopt --texture-compress webp --simplify false --join false --flatten false --instance false --palette false --prune false > /dev/null
done
du -ch public/models/*.glb | tail -1
