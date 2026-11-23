# Practical-by-practical scientific validation

For each practical this lists what the simulation does, what is simplified, and anything that **needs review** by a science teacher before it is relied on for exam preparation. Numbers come from `lib/labStore.ts` and the bench files.

## Biology

### Observing cells under the microscope
- **Objective:** focus a prepared slide at 40× using low-to-high power technique.
- **Apparatus:** compound microscope (4×, 10×, 40×, 100× oil), coarse and fine focus, prepared slides, lamp.
- **Valid procedure:** 4× → focus → 10× → refocus → 40× → fine focus only → record.
- **Invalid or penalised:** starting at 40×/100×; 100× without oil (image stays blurred).
- **Expected observation:** sharp image once focus is within the depth of field; the depth of field shrinks with magnification (sharpness sensitivity 3/6/12/18).
- **Common mistakes:** starting on high power; coarse focus at high power.
- **Simplifications:** slides are prepared for the student; no stain choice; light intensity is a simple multiplier.
- **Needs review:** the coarse-focus crack is warned about in the safety text but **not simulated**.

### Osmosis in potato strips
- **Objective:** % change in mass in 0.0–0.8 M sucrose; estimate the isotonic concentration.
- **Model:** % change = 30 × (0.3 − c) / 0.5, so +18% at 0.0 M, 0 at 0.3 M, −30% at 0.8 M, ±0.5% noise. Starting masses are random 2.0–2.6 g.
- **Expected result:** isotonic point ≈ 0.30 M (marked as full credit within 0.05 M).
- **Simplifications:** linear response; "Leave for 30 minutes" skips time; blotting is automatic and identical for every strip.
- **Needs review:** real potato data flatten at high concentration (plasmolysis); the linear model is fine for finding the crossing point but shouldn't be used to discuss the curve shape.

## Chemistry

### Acid–base titration
- **Objective:** volume of 0.100 M NaOH that neutralises 25.0 mL of 0.100 M HCl, with concordant titres.
- **Apparatus:** burette with funnel, conical flask on a white tile, 25 mL measuring cylinder, phenolphthalein, magnetic stirrer.
- **Model:** strong acid / strong base pH (`titrationPH`); equivalence at 25.00 mL; phenolphthalein turns pink above pH 8.2; flow about 0.5 mL/s open, or 0.05 mL single drops; a local pink flash where drops land, which lasts longer near the endpoint.
- **Valid procedure:** fill to 0.00 → 25 mL acid → indicator → mix → titrate fast, then dropwise → close at the first permanent pink → read the meniscus → **repeat until two titres agree within 0.10 mL**.
- **Mistakes:**
  - no indicator (spoils the run);
  - no acid (spoils the run);
  - overshoot over 26.5 mL (recoverable: becomes the rough titre, repeat).
- **Scoring:** mean of the closest concordant pair vs 25.00 mL; reading accuracy of each titre vs the true meniscus; technique; endpoint control (credited if an overshoot was followed by concordant repeats).
- **Simplifications:** the burette is always filled to exactly 0.00, so the initial reading is not taken (real practice records one); a measuring cylinder stands in for a pipette.
- **Needs review:** most syllabuses use a **25.0 cm³ pipette**, not a cylinder, for the acid. Consider swapping the apparatus.

### Flame tests
- **Objective:** identify Li⁺, Na⁺, K⁺, Ca²⁺, Cu²⁺ by flame colour.
- **Colours:** Li crimson (671 nm), Na yellow-orange (589), K lilac (766), Ca brick red (622), Cu blue-green (510).
- **Valid procedure (fixed this round):** clean the loop (dip in acid, heat until no colour) → dip in acid → dip in sample → edge of a **blue** flame → clean again before the next sample.
- **Mistakes:**
  - sash up (safety);
  - gas unlit (safety);
  - contaminated loop (technique, recoverable): the flame now shows both colours mixed and no identification is recorded;
  - yellow flame (technique): no identification recorded.
- **Simplifications:** sodium contamination from handling (which makes real Na⁺ yellow appear in almost every test) is not modelled.
- **Needs review:** whether to model ever-present sodium contamination, which is a real exam talking point.

### Rate of reaction (disappearing cross)
- **Objective:** effect of thiosulfate concentration on rate.
- **Model:** time to obscure = 600 / V(thio cm³) s ±5% (so 60 s at 10 cm³, 12 s at 50 cm³); rate ∝ concentration.
- **Valid procedure:** mixture in the flask → acid and stopwatch together → stop when the cross disappears → rinse → repeat at four or more concentrations.
- **Scoring:** concentrations tested; timing accuracy vs the true time; trend (higher concentration → shorter time).
- **Simplifications:** temperature is fixed; the endpoint is a sharp opacity threshold.
- **Safety:** SO₂ is produced, so ventilation is noted.

### Paper chromatography
- **Objective:** separate the dyes in inks A, B and an unknown; Rf of the red dye.
- **Model:** dyes travel Rf × solvent distance; A = blue 0.28 + yellow 0.72, B = red 0.47, unknown = blue 0.28 + red 0.47; the solvent front slows as it climbs.
- **Expected:** Rf(red) ≈ 0.47; the unknown is identified as a mixture containing A's blue and B's red.
- **Mistakes:** spotting without a baseline.
- **Simplifications:** the paper is always hung correctly with the baseline above the solvent, so the student **cannot** make the classic "spots below solvent" mistake.
- **Needs review:** add a placement choice so that mistake is possible and visible (the dyes wash into the solvent).

### Accurate weighing
- **Objective:** 0.1000–0.1500 g to four decimal places.
- **Model:** reading = mass − tare, drifting ±0.0004 g while the shield is open and settling when it is closed.
- **Valid procedure:** shield closed → tare the empty boat → open → add with the spatula → close → read.
- **Simplifications:** no static, temperature or levelling effects.

## Physics

### Ohm's law
- **Objective (as built):** current at three or more resistances with a fixed 12 V; show I = V / R.
- **Model:** I = V / R, ideal; over 1 A is a safety mistake.
- **Needs review (important):**
  1. The load is drawn as a **filament bulb**, which is **non-ohmic** (its resistance rises as it heats). Teaching Ohm's law with it is scientifically wrong. It should be a fixed resistor, or the practical should be reframed as "I–V of a bulb".
  2. There is **no voltmeter**, so the student never measures V across the component.
  3. The current is **recorded automatically**, so the student doesn't practise reading the ammeter.
- **Recommended flow:** fixed resistor; voltmeter in parallel, ammeter in series; vary the supply in steps; read both meters; plot V against I; the gradient is R.

### Measuring g with a pendulum
- **Objective:** g from T = 2π√(L/g) at three or more lengths.
- **Model:** θ(t) = A e^(−0.015t) cos(√(g/L) t) with A = 0.14 rad (≈ 8°); lengths 30, 45, 60, 75 cm; g = 9.81.
- **Valid procedure:** small release → time 10 swings from the middle → change length → repeat.
- **Measurement error:** comes from the student's own stopwatch timing (human reaction time). A timing more than 20% off the true value is flagged.
- **Simplifications:** the amplitude is fixed and the length is chosen from four presets rather than measured.
- **Needs review:** consider letting the student measure L from the rule to the centre of the bob (a common exam error is measuring to the top of the bob).
