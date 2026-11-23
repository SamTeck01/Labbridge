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
| C7 | **Ohm's law used a filament bulb, which doesn't obey Ohm's law, and had no voltmeter.** The current was also recorded for the student instead of read off the meter. | Fixed: a 12 Ω resistor (brown-red-black-gold bands) with an ammeter in series and a voltmeter across it. The student reads both dials in a close-up, takes 4+ rheostat settings and finds R from the gradient. |
| C8 | **Closing the burette tap waited for the hand animation.** On a slow laptop about 8 mL ran through after the click, so the app caused the overshoot, not the student. Found by the laptop click test. | Fixed: the tap closes the instant it's clicked, even mid-animation. |

## 2. High-impact improvements

- Done: **why** for every step, shown under the current step.
- Done: **fading help**. Guided on the first attempt, hints only after one completion, on your own after two. Curie still steps in for mistakes and safety; this is shown in the panel.
- Done: brief shows learn, apparatus, difficulty, time and exam skills before starting.
- Done: results explain "what to do differently".
- Done: burette (initial and final, titre = final − initial) and both electrical meters are read by the student from close-ups. Balance and stopwatch values are still displayed digitally, as on the real instruments.
- Done: microscope. Coarse focus at 40×/100× drives the slide into the lens and cracks it. This is recoverable with a fresh slide.
- Open: save the 3D apparatus state so a refresh mid-practical restores the bench, not just the checklist.

## 3. Medium priority

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
| Microscopy | 4× → focus → 10× → 40× → capture | Crack-the-slide not simulated; no drawing/labelling | **Fixed**: crack and recovery. Recommend a labelled drawing. |
| Osmosis | Weigh → tube ×5 → wait 30 min → blot and reweigh → isotonic point | Blotting is automatic (no technique); mass only | Why per step. Recommend: length option, blotting choice. |
| Titration | Fill → acid → indicator → mix → initial reading → titrate → endpoint → final reading | One titre only; overshoot was a dead end; burette always filled to exactly 0.00; tap closed late | **Fixed**: repeat runs, concordance, overshoot recovery, fill near zero with an initial reading, instant tap. |
| Flame tests | Sash → light → blue flame → 5 samples → gas off | Correct method flagged as contamination; dirty loop gave no feedback | **Fixed**: residue model, mixed colours, cleaning taught. |
| Rates | Pour mixture → acid → stop clock at cross → record → repeat | Only concentration varies | Works; recommend temperature. |
| Chromatography | Baseline → spots → choose depth → into solvent → remove → Rf | Couldn't hang it too low | **Fixed**: depth choice; a low baseline dissolves the spots and spoils the run, with an explanation. |
| Weighing | Tare → open → add → close → record | Fine; drift with the shield open teaches well | Works. |
| Ohm's law | Plug lead → close switch → read meters at 4+ settings → open → R from gradient | Filament bulb, no voltmeter, auto-read | **Fixed** (C7). |
| Pendulum | Release → time 10 swings → 3 lengths | Fixed set of 4 lengths; amplitude fixed small | Works; recommend reading length off the rule. |

## 6. Cross-platform

- Fixed (phone, landscape): the orientation card covered the Practicals button and half the view. It is now compact at the bottom, shows only the current task, and hides once a practical starts.
- Fixed (phone): the Practicals button overlapped Dr. Curie's bubble at a bench. It is hidden at benches on short screens.
- Library opens as a bottom sheet on phones with 44 px+ targets.
- Fixed: the frame delta cap is raised from 0.1 s to 0.25 s, so hand animations keep real time down to about 4 fps.
- Open: portrait phones get a "rotate" prompt; there is no real portrait layout.

## 7. Architecture risks

- Fixed: **duplicated implementations**. Six components (station modals, seated toolbar, old microscope viewer, old tutorial; about 2,600 lines) were unused and are removed.
- Partly fixed: the old physics sync also drove the ammeter needle and the bulb, fighting the bench. Removed. Legacy React state still exists for some switches and should be retired.
- Fixed: the burette and balance timers moved out of Dr. Curie's module into `lib/labSim.ts`.
- Open: `Lab3DScene.tsx` is about 1,850 lines and does scene setup, input, HUD and bench wiring.
- Open: mistakes are recorded once per practical. With repeat runs a second overshoot isn't counted again. That's acceptable for scoring, but noted.

## Tests

`tools/tests/practicals.mjs` (Playwright, 31 checks) and `tools/tests/laptop-journey.mjs` (a first-time student at 1366×768 doing titration and Ohm's law with real mouse clicks) cover:
- the orientation and the library;
- titration overshoot, new run, concordance and scoring;
- restart;
- flame-test cleaning and contamination with the real hand animations;
- no page errors.

Run it with `npm run dev -- -p 3100` and then `node tools/tests/practicals.mjs`.
