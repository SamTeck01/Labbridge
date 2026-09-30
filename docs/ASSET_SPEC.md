# LabBridge 3D Asset Spec

Real models replace the procedural placeholders without any code changes:

1. Export as **glTF binary (`.glb`)**, Y-up, **1 unit = 1 metre**, origin at the bottom centre.
2. Put it in `public/models/<name>.glb`.
3. Add `<name>` to `public/models/manifest.json`.

If a model is missing, the lab falls back to the procedural version.

## Budgets (the lab has to run on mid-range phones)

| Item | Triangles | Textures |
| --- | --- | --- |
| Hero equipment (microscope, titration rig) | ≤ 40k | one 2048² PBR set (baseColor, ORM, normal) |
| Bench props | ≤ 10k | 1024² |
| Dr. Curie (rigged) | ≤ 30k | 2048² body + 1024² face |
| Room shell (walls, floor, ceiling, benches, windows) | ≤ 80k | baked lightmap 2048² + tiling PBR materials |

Compress with `gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`. The loader supports Draco and Meshopt.

## Models

| File name | Real size | Interactive node names (exact) |
| --- | --- | --- |
| `microscope` | 38 cm tall compound binocular microscope | `micro_eyepieces`, `micro_turret` (rotates on its own axis), `micro_coarse_focus`, `micro_fine_focus`, `micro_stage`, `micro_slide`, `micro_light_switch` |
| `titration-rig` | 62 cm retort stand, 50 mL burette, 250 mL conical flask, magnetic stirrer | `chem_stopcock`, `chem_stirrer_knob`, `chem_stir_bar`, `chem_flask`, `chem_flask_liquid` (separate mesh; its colour is changed at runtime), `chem_indicator` |
| `physics-bench` | 1.4 m wide board: 12 V supply, knife switch, rheostat, bulb, ammeter | `phys_knife_switch` (pivot at the hinge), `phys_potentiometer`, `phys_bulb` |
| `analytical-bench` | 1.6 m: analytical balance with glass draft shield, benchtop centrifuge | `res_balance_door`, `res_tare_btn`, `res_centrifuge_start` |
| `dr-curie` | 1.70 m woman, lab coat, safety glasses, hair in a bun | Humanoid rig with a bone named `Head`. Animation clips: `Idle`, `Walk` (in place), and optionally `Talk`, `Point`, `Wave` |

Each interactive node must be its own object with its pivot where it physically rotates, because the code animates the node's transforms.

## Where to get assets
- **Poly Haven** (CC0): HDRIs, floor, wall and metal PBR textures.
- **Sketchfab**: filter for "Downloadable" and a CC-BY licence, and credit the author. Search "microscope", "burette", "lab bench".
- **Ready Player Me** or **Mixamo**: a rigged character, with Mixamo idle and walk clips for Dr. Curie.
- **Blender**: rename nodes to match the table above, set the pivots, bake the room lighting, and export as `.glb`.
