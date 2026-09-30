---
name: perf-budget
description: Keep LabBridge light and smooth on laptops and phones. Use whenever someone reports lag, heat, fan noise, high RAM, battery drain, or before merging any change to the 3D scene, benches, models, textures or render loop. Measures the scene against hard budgets with tools/perf/measure.mjs and walks the known pitfalls in this codebase.
---

# LabBridge performance budget

LabBridge must run **lightly** (cool, quiet, low RAM) and **smoothly** (steady frame rate) on an
ordinary laptop with integrated graphics and on mid-range phones. Pretty but hot is a bug.

## Budgets (fail any = fix before merging)

| Metric | Budget | Why |
| --- | --- | --- |
| Frame rate while idle (no input, nothing animating) | ≤ 15 fps | Idle GPU work is what spins fans all day |
| Frame rate while active | capped at 60 fps | 120/144 Hz laptops would otherwise double the work |
| Hidden tab / other window focused | ≤ 5 fps (rAF already stops when hidden) | No work nobody sees |
| Draw calls (in lab, any bench) | ≤ 180 | Integrated GPUs choke on call count |
| JS heap after load | ≤ 150 MB | RAM |
| JS heap growth over 60 s idle | ≤ 5 MB | Leaks (geometry/texture/canvas churn) |
| GPU textures (renderer.info.memory.textures) | ≤ 45 | Each large texture is several MB |
| Shadow map | ≤ 1024² desktop, off on phones | 2048² = 16 MB and a full scene re-render |

## How to measure

```bash
npm run dev            # or: npm run build && npm start (closer to production)
node tools/perf/measure.mjs            # desktop profile
node tools/perf/measure.mjs --mobile   # phone profile
```
It enters the lab, sits at a bench, then reports draw calls, triangles, textures, geometries, JS heap,
frames rendered while idle vs active, and heap growth, against the budgets above (PASS/FAIL).
Headless software rendering is slow, so trust the *counts* (frames rendered, calls, memory), not fps.

## Known pitfalls in this codebase (check each)

1. **Render loop never rests.** `components/Lab3DScene.tsx` must go through `FrameScheduler`
   (`lib/scenePerf.ts`): full rate only while something is moving (input, camera transition, hands,
   pouring/dripping, stirring, flame, centrifuge, Curie walking), otherwise idle rate.
   Any new animation must register as activity (`scheduler.poke()` or an `isAnimating` check).
2. **Uncapped refresh rate.** Never render faster than 60 fps.
3. **Per-frame allocations** (`new THREE.Vector3()` in `update()`/`apply()` loops) cause GC stutter.
   Use scratch objects.
4. **Canvas textures keep their canvas in RAM** (posters, whiteboard, balance display). Release the
   canvas backing after upload with `releaseCanvasAfterUpload(texture)`.
5. **Geometry rebuilt per frame** (liquids, pour stream): only when the value changes, always dispose the old one.
6. **Raycasting skinned meshes** (Curie, hands) deforms every vertex on the CPU: use hitboxes, set `raycast = () => {}`.
7. **Real-time extras** (GTAO, shadows, transmission glass, point lights) go through `QualityManager`
   tiers; never force them on.
8. **React re-rendering the scene component** on lab-state ticks: keep `useLab` subscriptions in small
   child components (`ApparatusSync`), never in `Lab3DScene` itself.
9. **Merged static geometry**: originals must be disposed after `mergeStaticMeshes` unless shared.
10. **Baking hidden or camera-attached objects**: `mergeStaticMeshes` must skip anything invisible (at
    any ancestor) or under the camera, or it freezes a copy into the room (this happened with the old
    first-person body: floating white cylinders). Delete unused objects instead of hiding them.
11. **WebGL contexts on remount**: leaving the lab must `renderer.dispose()` *and* `forceContextLoss()`;
    browsers cap live contexts and each holds GPU memory.
12. **Service worker caches**: build assets cache-first with a size cap (old deploys trimmed); models
    stale-while-revalidate so updated models reach installed users. Never cache `/api/`.
13. **Unbounded arrays in long sessions** (chat history, logs, readings): cap them.
14. **Dev server**: `next dev` itself uses 1-2 GB RAM and a CPU core. Judge performance on a production
    build (`npm run build && npm start`) or the deployed site.

## Procedure

1. Run the measurement (desktop and `--mobile`). Note every FAIL.
2. For each FAIL, find the cause via the pitfalls list; fix the cause, not the symptom.
3. Re-measure. Only merge when all budgets pass.
4. If a new feature needs more budget, remove cost elsewhere; don't raise the budget.
