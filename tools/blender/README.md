# Blender asset scripts

Each script builds one lab model in code and exports it to `public/models/<name>.glb`. Rebuilding a model is reproducible and can be reviewed in a diff.

```bash
pip install bpy==4.2.0          # needs Python 3.11
python3 tools/blender/titration_rig.py --preview out.png   # --preview also renders a studio image
```
After exporting a new model, add its name to `public/models/manifest.json`.

To rebuild and compress everything in one step, run `tools/blender/build_all.sh`. It uses meshopt compression and keeps the named nodes intact.

| Script | Output |
| --- | --- |
| `lab_room.py` | `lab-room.glb`: floor, walls, ceiling and LED panels, windows, and the four island benches |
| `microscope.py` | `microscope.glb` |
| `titration_rig.py` | `titration-rig.glb` |
| `physics_bench.py` | `physics-bench.glb` |
| `analytical_bench.py` | `analytical-bench.glb` |
| `lab_furniture.py` | `lab-stool`, `fume-hood`, `safety-shower`, `whiteboard`, `reagent-shelf` |
Node names must match `docs/ASSET_SPEC.md`, because the game uses them to make parts clickable.
