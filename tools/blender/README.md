# Blender asset scripts

Each script builds one lab model in code and exports it to `public/models/<name>.glb`. Rebuilding a model is reproducible and can be reviewed in a diff.

```bash
pip install bpy==4.2.0          # needs Python 3.11
python3 tools/blender/titration_rig.py --preview out.png   # --preview also renders a studio image
```
After exporting a new model, add its name to `public/models/manifest.json`.
Node names must match `docs/ASSET_SPEC.md`, because the game uses them to make parts clickable.
