# LabBridge

LabBridge is a first-person 3D virtual science lab that runs in the browser. It has four benches (microscopy, titration, circuits and analytical) and **Dr. Curie**, an AI lab manager who walks the lab floor, watches your experiment and steps in when something goes wrong.

## Run
```bash
bun install        # or npm install
cp .env.example .env.local   # set GEMINI_API_KEY
bun run dev
```
Without `GEMINI_API_KEY`, the lab still runs, but Dr. Curie shows as offline.

## Architecture
- `lib/labStore.ts`: the **single source of truth** for all experiment state, plus the pure simulation functions (titration pH, Ohm's law). The 3D scene, the HUD and Dr. Curie all read from and write to it.
- `lib/curie.ts`: Dr. Curie's brain. There is one shared conversation, and every request includes a live lab-state snapshot. Any actions she takes through tool calling are applied to the store. It also runs the proactive "lab manager" rules (endpoint overshoot, no indicator, high current).
- `app/api/assistant/route.ts`: the Gemini endpoint. It takes the conversation history and lab state, exposes function declarations for lab actions, and returns proper HTTP errors when something fails.
- `lib/curieNPC.ts`: Dr. Curie in 3D. She walks to your bench, turns to face you and tracks you with her head. She uses `public/models/dr-curie.glb` if it exists.
- `lib/assetLoader.ts`: the glTF/Draco/Meshopt pipeline. Real `.glb` models listed in `public/models/manifest.json` replace the procedural placeholders automatically.
- `components/Lab3DScene.tsx`: the Three.js scene. It is built once, frees its GPU resources on unmount, and uses image-based lighting.

## Making it look real
The current geometry is procedural placeholder art. See:
- `docs/ASSET_SPEC.md`: the exact model list, sizes, node names and polygon budgets.
- `docs/CLAUDE_DESIGN_PROMPT.md`: the prompt for the art direction, UI and Dr. Curie design.
