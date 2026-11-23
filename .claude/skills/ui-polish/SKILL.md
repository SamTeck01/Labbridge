---
name: ui-polish
description: Review or change any LabBridge screen, panel, HUD, button, card or copy so it feels crafted, calm and easy to use - not generic "AI slop". Use when touching components/, styling, onboarding copy, or when someone says the UI looks cheap, cluttered, confusing, templated or hard to use.
---

# UI polish for LabBridge

The user is a 14–17-year-old on a cheap laptop or a phone, often on slow data. Every screen must answer, within 2 seconds: *where am I, what do I do next, how do I undo it.*

## Anti-slop checklist (reject on sight)
- Gradient text, purple-to-blue gradients, glowing borders, glassmorphism stacked on glassmorphism.
- Emoji used as icons. Use the `svg-icons` skill instead.
- Generic copy: "Unlock your potential", "Seamless", "Elevate", "Dive in", "Let's get started!". Write like a lab teacher: short, concrete verbs ("Fill the burette to just below 0.00").
- Everything in a rounded card with a shadow. Hierarchy comes from type size, weight and spacing first.
- Three or more accent colours on one screen. LabBridge uses slate + one teal accent; red only for safety, amber only for warnings.
- Centred paragraphs, walls of text, more than ~12 words on a button.
- Decorative motion. Motion must explain cause and effect (the burette fills, the needle moves).
- Placeholder-looking numbers ("99% of students…") or fake testimonials.

## Usability rules
- One primary action per view; it is the most visible thing.
- Targets ≥ 44 px on touch; nothing important within 16 px of the screen edge on phones.
- Overlays never cover the thing the student must look at (the apparatus, Curie's bubble, the current step).
- Every destructive action is confirmed or undoable. Every modal has Esc/Cancel.
- Show state, not just events: the current step, what's recorded, what's wrong now.
- Text contrast ≥ 4.5:1; never convey meaning by colour alone (safety mistakes get an icon + word).
- Test at 1366×768, 1280×720, 390×844 landscape-rotated (844×390) and 360×640.

## Smoothness (pair with `perf-budget`)
- No React state updates per animation frame; drive 3D from refs/stores.
- No layout-thrashing CSS (animate transform/opacity only); avoid `backdrop-filter` over the WebGL canvas on low-end devices.
- Lazy-load heavy panels; keep the initial JS small.
- After a change, run `tools/perf/measure.mjs` and compare against the budgets.

## How to review
1. Screenshot the screen at the viewports above.
2. List every violation from the two checklists with the file and line.
3. Fix the highest-impact ones; re-screenshot; compare before/after.
