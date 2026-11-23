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
- **Crack (implemented):** turning the coarse knob to raise the stage at 40×/100× cracks the slide (image ruined, safety mistake). A fresh slide from the box recovers.

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
- **Readings (implemented):** the burette fills to just below zero (a reading of 0.10–0.60 mL); the student reads initial and final values; titre = final − initial.
- **Simplifications:** a measuring cylinder stands in for a pipette.
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
- **Placement (implemented):** the student chooses how deep to hang the paper. With the baseline under the solvent, the spots dissolve away and the run is spoiled, with an explanation.

### Accurate weighing
- **Objective:** 0.1000–0.1500 g to four decimal places.
- **Model:** reading = mass − tare, drifting ±0.0004 g while the shield is open and settling when it is closed.
- **Valid procedure:** shield closed → tare the empty boat → open → add with the spatula → close → read.
- **Simplifications:** no static, temperature or levelling effects.

## Physics

### Ohm's law
- **Objective:** show V ∝ I for a fixed resistor and find R from the gradient of V against I.
- **Circuit:** 12 V supply → switch → ammeter (series) → 12 Ω resistor (brown-red-black-gold) → rheostat (10–100 Ω) → back; voltmeter across the resistor only.
- **Model:** I = V_supply / (12 + R_rheostat); V_resistor = 12 I. Meters are analogue (0–1 A, 0–10 V) and read by the student in a close-up.
- **Valid procedure:** complete the circuit → close the switch → read both meters → change the rheostat → repeat (4+) → open the switch → R = gradient.
- **Mistakes:** over 0.5 A (the resistor overheats, a safety mistake, recoverable by turning the rheostat up).
- **Expected result:** R ≈ 12 Ω; full credit within 5%.
- **Simplifications:** ideal meters (no meter resistance); the resistor doesn't actually change value when hot (the warning teaches the idea).

### Measuring g with a pendulum
- **Objective:** g from T = 2π√(L/g) at three or more lengths.
- **Model:** θ(t) = A e^(−0.015t) cos(√(g/L) t) with A = 0.14 rad (≈ 8°); lengths 30, 45, 60, 75 cm; g = 9.81.
- **Valid procedure:** small release → time 10 swings from the middle → change length → repeat.
- **Measurement error:** comes from the student's own stopwatch timing (human reaction time). A timing more than 20% off the true value is flagged.
- **Simplifications:** the amplitude is fixed and the length is chosen from four presets rather than measured.
- **Needs review:** consider letting the student measure L from the rule to the centre of the bob (a common exam error is measuring to the top of the bob).
