# Prompt for Claude Design

Claude Design produces visual designs and interactive prototypes. It does **not** export production `.glb` 3D models. Use it to lock the **art direction, the HUD/UI and Dr. Curie's look**. Then build or source the actual 3D models to match, using `docs/ASSET_SPEC.md` (Blender, Sketchfab, Poly Haven, Mixamo).

Paste everything below the line.

---

Design **LabBridge**, a first-person 3D virtual science laboratory for secondary-school and first-year university students. It runs in the browser (desktop and phones in landscape) and is built with Three.js. I need the full visual direction and UI so the 3D team can build a lab that looks like a real, photographed university teaching lab. It should not look stylised, cartoonish or like a toy.

## 1. Art direction board
- Reference look: a modern university teaching lab photographed around 10am in daylight.
  - Black epoxy-resin benchtops and pale grey cabinetry.
  - Brushed steel fittings, borosilicate glassware, vinyl safety flooring, and suspended LED panels.
  - Large windows on one wall.
  - The small imperfections that make it real: labels, scuffs, cable runs, a hand-written whiteboard.
- Deliver:
  - a colour palette sampled from real labs
  - a material list (epoxy resin, brushed steel, borosilicate glass, painted steel, vinyl floor, ceramic tile, rubber) with reference photos and roughness/metalness notes for PBR
  - a lighting mood: soft daylight plus cool LED, with gentle contact shadows
- Show 4 hero "screenshots" of the lab as it should look in-engine:
  - the entrance view down the central aisle
  - seated at the microscope bench
  - the titration bench close-up
  - the physics circuit bench

## 2. Room layout (top-down plan)
- The room is 24 × 24 m.
- Four island benches, each 3.6 × 1.8 m, with stools:
  - Biology/Microscopy (front-left)
  - Chemistry/Titration (front-right)
  - Physics/Circuits (back-left)
  - Analytical/Research (back-right)
- A central aisle.
- Along the walls:
  - a fume hood on the back wall
  - a safety shower and eyewash on the right wall
  - a whiteboard with Dr. Curie's desk on the front wall
  - windows on the left wall
  - reagent shelving above the benches
- Mark the player spawn point, Dr. Curie's home spot, and where she stands at each bench.

## 3. Dr. Curie, the lab manager NPC
- Character sheet:
  - front, side and back turnaround plus a face close-up
  - a warm, confident scientist in her 40s
  - a white knee-length lab coat over smart clothes, safety glasses, hair in a bun, closed shoes, an ID badge on a lanyard
- Style: realistic human proportions. Not chibi and not anime.
- Expression sheet: neutral, explaining, pleased, concerned (a safety warning).
- Pose and animation sheet: idle, walking, pointing at equipment, demonstrating (hands on the apparatus), arms-crossed "waiting".

## 4. HUD and UI (desktop 1280×720 and phone landscape 844×390)
The UI must feel like a calm, premium scientific instrument, not a game menu:
- minimal chrome
- a real type scale with nothing below 12px
- one accent colour
- light and dark variants

Design these:
1. **Landing / station picker.** A hero image of the lab, and four station cards.
2. **In-lab HUD.**
   - a centre reticle
   - a contextual hover label ("Burette stopcock · Click to open")
   - a compact mini-map
   - a movement joystick (touch)
   - one button to talk to Dr. Curie
   - the notebook
3. **Dr. Curie conversation.**
   - Two modes: an in-world speech bubble above her head (short lines), and an expanded chat panel.
   - The panel has message history, suggested questions, and "Dr. Curie did: closed burette" action chips.
   - Include an offline/error state.
4. **Seated bench HUD.** An instrument readout panel per station:
   - Microscope: objective, focus, slide.
   - Titration: volume dispensed, live pH curve, indicator status.
   - Circuit: V, I, R, bulb power.
   - Balance: mass reading, centrifuge rpm.
5. **Microscope eyepiece view.** A circular field of view with a focus blur state and a capture-to-notebook button.
6. **Lab notebook.** Captured observations, measurements table, and export.
7. **Experiment brief and result.** Objective, procedure checklist, safety notes, then a results summary with Dr. Curie's feedback and a score.
8. **Safety warning state.** Dr. Curie intervening, for example when the burette is left open past the endpoint.

## 5. Deliverables
- The art direction board.
- The room plan.
- The Dr. Curie character sheet.
- Every HUD screen, in desktop and phone landscape.
- A small component library (buttons, panels, readouts, chips, bubbles) with design tokens (colour, type, radius, spacing, elevation).
- A 3D asset list that matches the art direction, with real-world dimensions for each item:
  - microscope 38 cm
  - retort stand 62 cm
  - 50 mL burette
  - 250 mL conical flask
  - magnetic stirrer
  - 12 V DC supply, knife switch, rheostat, filament bulb, ammeter
  - analytical balance with draft shield
  - benchtop centrifuge
  - lab stool
  - fume hood
  - safety shower
  - reagent shelf
