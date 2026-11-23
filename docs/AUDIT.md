# LabBridge audit (November 2026)

Audited against one standard: a 14–17-year-old with no lab access should be able to use LabBridge, make mistakes, understand them, and later recognise the real apparatus and procedure.

The audit was run on the click-to-do version that is live now, by reading the code and driving every bench with Playwright. "Fixed" marks what this round changed; everything else is still open.

## How it works today (architecture in brief)

| Concern | Where | Notes |
|---|---|---|
| Practical definitions (steps, mistakes, scoring) | `lib/experiments.ts` | Steps complete strictly in order: a step's `done(lab, run)` is checked on every state change. |
| What each practical teaches (new) | `lib/practicalMeta.ts` | Subject, difficulty, apparatus, exam skills, the *why* of each step, mistake type and consequence. |
| Lab state | `lib/labStore.ts` | One store per bench. Pure science helpers live here: pH, period, obscure time, osmosis, Rf. |
| Interaction | `lib/workbench/*.ts` | Each bench class maps a clicked id to a hand animation (`perform`) that updates the store. Clicks during an animation are queued (latest wins). |
| Mistake detection | `experiments.ts` (`mistakes[].check`) plus `experiments.count()` from benches | Each mistake is recorded once per practical. Benches count repeatable ones such as contamination. |
| Dr. Curie | `lib/curie.ts` and `/api/assistant` (Gemini) | Gets the live lab state, the practical, current step, readings and mistakes. Coaches on step and mistake events. |
| Safety | Goggles gate on the brief, mistakes typed `safety`, Curie watchers | |
| Reset | `experiments.start/abandon/restart` → `labStore.resetKey` plus `bench.reset()` | |
| Persistence | `localStorage` (`labbridge.experiments.v1`) | Progress and history survive refresh; the 3D apparatus does not. |
| Mobile | `isTouch` branches in `Lab3DScene.tsx`, landscape prompt, joystick | |

## 1. Critical problems

| # | Problem | Status |
|---|---|---|
| C1 | **Titration took one titre and stopped.** No repeat, no concordance, and overshooting ended the practical. This is the opposite of how titration is taught and examined. | Fixed: "New run", two titres within 0.10 mL needed, overshoot recorded as a rough titre with credit for repeating, plus "Finish with these results" so no one is stuck. |
| C2 | **Flame test punished the correct method.** Dipping a clean loop in acid and then in the sample (the textbook method) counted as contamination. A truly dirty loop gave no visible clue. | Fixed: the loop now tracks the residue actually on it. A contaminated test shows two mixed colours with an explanation, and cleaning means acid, then heat until no colour. |
| C3 | **No way to restart a practical mid-way.** The only option was ✕, which abandoned everything with no confirmation. | Fixed: "Restart practical" (two-tap confirm) and a confirmation before abandoning. |
| C4 | **No overview of practicals.** Students had to walk around to discover benches and had no idea of difficulty or where to start. | Fixed: practical library (subject, learn, difficulty, time, apparatus, safety, exam skills, best score, "Start here", one tap to the bench). |
| C5 | **Onboarding was three text cards** that taught nothing by doing. | Fixed: a five-task orientation that ticks off as the student does each thing. It never blocks the lab and adapts to short phone screens. |
| C6 | **Mistakes said what was wrong but not why it mattered**, and every mistake looked the same. | Fixed: each mistake is typed (safety, procedure, measurement, technique) and marked as recoverable or spoiling the run, with "what it does to your result → what to do now". |
| C7 | **Ohm's law uses a filament bulb as the resistor and has no voltmeter.** A bulb is non-ohmic, and the "current" reading is recorded for the student, not read off the meter. | Open, needs a science decision (see `PRACTICALS.md`). |

## 2. High-impact improvements

- Done: **why** for every step, shown under the current step.
- Done: **fading help**. Guided on the first attempt, hints only after one completion, on your own after two. Curie still steps in for mistakes and safety; this is shown in the panel.
- Done: brief shows learn, apparatus, difficulty, time and exam skills before starting.
- Done: results explain "what to do differently".
- Open: student-read instruments everywhere. Burette reading is student-read; the ammeter, balance and stopwatch values are still taken automatically in some practicals.
- Open: microscope: "coarse focus at high power cracks the slide" is warned about but not simulated.
- Open: save the 3D apparatus state so a refresh mid-practical restores the bench, not just the checklist.

## 3. Medium priority

- Ohm's law: switch to a fixed resistor, add a voltmeter in parallel, vary the supply and plot V against I.
- Rates: a temperature variable (water bath) would let students see a second factor.
- Pendulum: let the student read the length off the metre rule instead of it being shown.
- Osmosis: record length as well as mass (several exam boards use length).
- A drawing or labelled-diagram step for microscopy (exam skill).

## 4. Nice to have

- Exam-board marking schemes mapped onto `ExamSkill` tags (the data structure is in place).
- Teacher view of class results.
- Offline caching of the 3D models for low-data areas.

## 5. Practical-by-practical

| Practical | Current flow | Problems found | Done now / recommended |
|---|---|---|---|
| Microscopy | 4× → focus → 10× → 40× → capture | Crack-the-slide warning not simulated; no drawing/labelling | Why per step. Recommend: crack consequence, labelled drawing. |
| Osmosis | Weigh → tube ×5 → wait 30 min → blot and reweigh → isotonic point | Blotting is automatic (no technique); mass only | Why per step. Recommend: length option, blotting choice. |
| Titration | Fill → acid → indicator → mix → titrate → endpoint → read | One titre only; overshoot was a dead end; burette always filled to exactly 0.00 | **Fixed**: repeat runs, concordance, overshoot recovery. Recommend: read an initial reading too. |
| Flame tests | Sash → light → blue flame → 5 samples → gas off | Correct method flagged as contamination; dirty loop gave no feedback | **Fixed**: residue model, mixed colours, cleaning taught. |
| Rates | Pour mixture → acid → stop clock at cross → record → repeat | Only concentration varies | Works; recommend temperature. |
| Chromatography | Baseline → spots → into solvent → remove → Rf | Cannot do it wrong in placement (baseline is always above the solvent) | Works; recommend a "too low" placement choice. |
| Weighing | Tare → open → add → close → record | Fine; drift with the shield open teaches well | Works. |
| Ohm's law | Plug lead → close switch → 3 readings → open | Filament bulb (non-ohmic), no voltmeter, current auto-read | Flagged (C7). |
| Pendulum | Release → time 10 swings → 3 lengths | Fixed set of 4 lengths; amplitude fixed small | Works; recommend reading length off the rule. |

## 6. Cross-platform

- Fixed (phone, landscape): the orientation card covered the Practicals button and half the view. It is now compact at the bottom, shows only the current task, and hides once a practical starts.
- Fixed (phone): the Practicals button overlapped Dr. Curie's bubble at a bench. It is hidden at benches on short screens.
- Library opens as a bottom sheet on phones with 44 px+ targets.
- Open: hand animations use a frame delta clamped to 0.1 s, so below about 10 fps they run in slow motion. Low-end phones at 15–30 fps are unaffected, but this should be time-based.
- Open: portrait phones get a "rotate" prompt; there is no real portrait layout.

## 7. Architecture risks

- Fixed: **duplicated implementations**. Six components (station modals, seated toolbar, old microscope viewer, old tutorial; about 2,600 lines) were unused and are removed.
- Open: legacy `setChemistryState`/`setPhysicsState` React state in `Lab3DScene.tsx` still exists alongside `labStore`, a risk of the UI and the simulation disagreeing. Everything new goes through `labStore`.
- Open: burette dispensing runs on a `setInterval` inside `curie.ts` (Dr. Curie's module), so the simulation is coupled to the AI module. It should move to the titration bench or the store.
- Open: `Lab3DScene.tsx` is about 1,850 lines and does scene setup, input, HUD and bench wiring.
- Open: mistakes are recorded once per practical. With repeat runs a second overshoot isn't counted again. That's acceptable for scoring, but noted.

## Tests

`tools/tests/practicals.mjs` (Playwright, 21 checks) covers:
- the orientation and the library;
- titration overshoot, new run, concordance and scoring;
- restart;
- flame-test cleaning and contamination with the real hand animations;
- no page errors.

Run it with `npm run dev -- -p 3100` and then `node tools/tests/practicals.mjs`.
