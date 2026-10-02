---
name: lab-interaction
description: Design and build realistic, hands-on interaction for LabBridge equipment - grabbing, carrying, pouring, swirling, turning taps and knobs, reading scales - so the student physically does the practical instead of tapping to trigger animations. Use whenever adding or changing a practical, a piece of equipment, the first-person hands, input handling (mouse, touch, keyboard), or anything Dr. Curie does with her hands. Also use when someone says an interaction feels fake, clunky, too automatic, or "just numbers".
---

# Realistic lab interaction

LabBridge is a lab, not a quiz with a 3D backdrop. The student should feel like they are
holding glassware: its weight, how it tilts, the liquid sloshing, the drip slowing as they
close the tap. Every rule below serves one test:

> **If you muted the screen text, could a teacher watching over the student's shoulder tell
> whether they did the practical well?**

If the answer is no, the interaction is wrong.

## 1. Principles (non-negotiable)

1. **Direct manipulation, not playback.** The student's input drives the object
   continuously. Tilt angle sets pour rate; tap angle sets drip rate; swirl speed sets
   mixing. A tap that plays a canned 2-second animation is a last resort (see §7, Assist).
2. **Analogue, not binary.** Real equipment has a range: half-open tap, slow pour, a
   gentle swirl. Model the range and let it matter (overshooting the endpoint, spilling).
3. **Consequences are real and visible.** Pour past the rim and it spills on the bench
   (puddle, Curie notices, score drops). Open the burette fully near the endpoint and you
   overshoot. Nothing is silently clamped to "correct".
4. **The hands do it.** Every manipulation is shown through the first-person hands with the
   right grip. Objects never float on their own while held.
5. **Physical plausibility over physics simulation.** No rigid-body engine. Kinematic
   objects + small hand-written constraints (rest on surfaces, can't pass through the
   bench, can't overlap sockets) look right and cost nothing. See §6.
6. **Feedback on every channel:** motion (slosh, drip, stream), sound (scaled by flow/speed),
   haptics on phones (`navigator.vibrate`, short pulses on contact/snap), and a light hint
   ring, never a wall of text.
7. **Same verbs for student and Curie.** Curie's demos call the exact same interaction API
   with scripted input, so anything she can do the student can do and vice versa.
8. **Performance stays inside `perf-budget`.** Interaction runs only while engaged; idle
   still drops to the idle frame rate. No allocation per frame.

## 2. The interaction model

### 2.1 States

```
 idle ──hover──▶ hover ──press──▶ held ──release over socket──▶ placed
                   │                │ ├─ tilt ─▶ pouring
                   │                │ ├─ circle ─▶ swirling
                   │                │ └─ release elsewhere ─▶ set down on the bench (or dropped)
                   └──press on a control──▶ manipulating (knob / tap / valve / slider)
```

Exactly one object can be held per hand. The right hand is the active hand; the left hand
steadies (holds the flask while the right works the burette tap, holds the beaker while
pouring from a measuring cylinder).

### 2.2 Verbs (the whole vocabulary)

| Verb | What the student does | What it controls |
|---|---|---|
| **Grab** | press on an object | picks it up with the grip for its class |
| **Carry** | move pointer / drag finger | moves it over a work plane ~10 cm above the bench, follows surfaces |
| **Lift / lower** | scroll / two-finger pinch / `Q` `E` | height above the bench (e.g. to reach a burette funnel) |
| **Tilt** | hold right mouse + move / two-finger twist / `R` `F` | tilt angle → pour rate |
| **Swirl** | small circles while holding | slosh + mixing rate |
| **Place** | release over a socket (glows) | snaps into the socket: under the burette, on the balance, in the rack |
| **Set down** | release over the bench | rests where it is, upright |
| **Turn** | drag around a knob / tap / valve | angle → continuous value (flow, voltage, gas, focus) |
| **Press** | tap a button | stopwatch, balance tare, switch |
| **Read** | look closely (double-tap / `Space`) | camera eases in to eye level for a scale, meniscus, display |

No other verbs. If a new practical seems to need one, first try to express it with these.

### 2.3 Input mapping

| | Desktop | Phone / tablet |
|---|---|---|
| Grab / release | left button down / up | one finger down / up |
| Carry | mouse move | drag |
| Lift / lower | wheel | two-finger pinch |
| Tilt (pour) | right button + vertical drag, or `R`/`F` | two-finger twist |
| Turn a control | drag around it (angle from centre) | same |
| Read close | double-click / `Space` | double-tap |
| Look around | middle button / hold `Alt` / move to edge | drag on empty space |

Rules: never require precision under 24 CSS px on touch; every gesture has a keyboard
equivalent; the pointer is captured while held so carrying never turns into looking.

## 3. Equipment classes

Each piece of kit declares one class. The class picks the grip, the constraints and the
behaviour; the practical just configures it.

- **Vessel** (beaker, flask, test tube, measuring cylinder): `capacity`, `contents`
  (see §5), `lip` point, `pourCurve` (tilt° → mL/s). Pours from its lip when tilted past
  the angle where the liquid surface reaches the lip, which depends on how full it is (a full
  beaker pours at 10°, a nearly empty one needs 70°). Liquid surface stays world-level
  (rotate the liquid mesh's surface plane opposite to the vessel) with a spring-damper
  slosh driven by the vessel's acceleration.
- **Dispenser** (burette, pipette, dropper, tap): a `valve` 0..1 from a Turn control;
  flow = `k·valve²` (quadratic, so the last quarter turn is the fine control). Burette
  drops become discrete at low flow, a stream at high flow.
- **Control** (knob, tap, slider, focus wheel, turret): an angle with detents, limits and
  friction. Drag maps 1:1 to angle around the pivot; release keeps the angle. Detents
  click (sound + 10 ms haptic).
- **Tool** (pencil, spatula, glass rod, loop, tongs): held at the tip; contact with a
  target surface triggers the tool's action (draw line, take a spatula of solid, stir,
  dip loop into flame).
- **Instrument** (balance, stopwatch, microscope, voltmeter): sockets + buttons + a
  readable display. Readings come from the simulation, never from a script.
- **Fixture** (clamp stand, rack, tile, sink, bench): sockets and surfaces only.

### Grips (hand poses)

`wrap` (beaker, cylinder: fingers round the body), `neck` (conical flask), `pinch` (test
tube, dropper, pencil), `knob` (thumb + index on a small control), `press` (index finger),
`steady` (left hand flat behind or around the base). Each grip is a fixed finger pose plus
an attach transform on the object; the wrist is solved by 2-bone IK to that transform.

## 4. Practicals, re-imagined

### Titration (the flagship; build this first)
1. Grab the burette funnel? No: grab the **beaker of acid**, carry it up (lift) to the
   funnel, **tilt** to pour. The burette fills visibly; overfill above 0 spills from the
   funnel. Then **turn** the tap briefly into the waste beaker to clear the air bubble from
   the jet (a real step, scored).
2. **Read** the initial burette value at eye level; parallax if you read from above.
3. **Pipette** 25.0 mL alkali: squeeze the filler (hold), draw past the line, release
   slowly to the line at eye level, carry to the flask, drain, touch the tip to the glass.
4. **Dropper**: 2-3 drops of indicator (each press = one drop).
5. Place the flask under the burette on a white tile. Right hand **turns the tap**, left
   hand **swirls** the flask (left-hand swirl is automatic while the right is on the tap
   unless the student stops; swirl quality is visible and scored).
6. Colour change is computed from moles in the flask, with a local pink flash where drops
   land that fades with swirling. Near the endpoint the flash lasts longer: the cue real
   students use to slow down.
7. Overshoot is possible and permanent for that run.

### Microscope
Carry the slide, place it on the stage (socket), clip it. Turn the coarse focus with the
eyepiece view picture-in-picture, then fine focus; turret clicks between objectives with
detents. Turning coarse focus down at 40× crashes the objective into the slide (crack
sound, broken slide, safety mark lost).

### Flame tests
Hold the wire loop (tool) with tongs-like `pinch`; dip in acid (clean), into the salt
sample, then into the **edge** of the blue flame. Colour intensity depends on how much
of the loop is in the hottest zone; pulling out ends it. Gas knob is a Control; the air
hole collar is a Control (yellow vs blue flame is a real consequence).

### Ohm's law
Plug wires (tool) into terminals (sockets) with a drag from terminal to terminal; a
wrong-polarity meter reads negative; the rheostat is a slider Control.

### Pendulum, rates, osmosis, chromatography
- Pendulum: grab the bob, pull aside (angle shown by its actual position), release. Large
  angles are allowed and give a wrong g, with Curie's comment.
- Rates: pour from the measuring cylinder (tilt control) into the flask; acid poured slowly
  vs all at once changes the start time, scored.
- Osmosis: carry strips with forceps (tool), blot by pressing on the towel (press duration
  = how dry), balance tare button.
- Chromatography: draw the baseline by dragging the pencil (it's a line where you drew it;
  crooked lines are measurable), spot with a capillary (press duration = spot size, big
  spots smear), lower the paper by hand; below the solvent line, the spots wash off.

## 5. Contents and chemistry

Every Vessel holds `contents: { [species]: moles } + volume`. Pouring moves a fraction of
volume (and species proportionally) from source to target per frame. Reactions resolve
on mixing via small rule functions (neutralisation, thiosulfate+acid, indicators by pH).
Colour, cloudiness and temperature are **derived** from contents, never set by a script.
This is what makes spills, overshoots and wrong orders behave correctly for free.

## 6. Constraints instead of physics

- Held objects: target = pointer ray ∩ work plane; position follows with a critically
  damped spring (ω ≈ 18 rad/s) so they feel weighted; heavier kit uses a lower ω.
- Rotation lag: tilt toward the direction of motion (≤ 8°), which drives the slosh.
- Collision: test the held object's bounding cylinder against the bench top, sockets and
  other placed kit (all cylinders/boxes; a few dozen tests per frame). Push out, never pass
  through.
- Set down: lower until the base touches the surface below, settle upright with a small
  wobble and a clink scaled by speed. Released above ~25 cm / fast = it falls; glass
  breaks above a speed threshold (shards, safety mark, Curie: "Dustpan, not fingers").
- Sockets: radius + allowed classes; within 4 cm they glow, within 2 cm they magnetise.

## 7. Assist and accessibility

- **Assist mode** (setting, and automatic after 3 failed attempts at a gesture): the
  gesture becomes press-and-hold; the hands perform it at a good, steady rate while held,
  and stop on release. The student still controls *when* and *how much*.
- Every continuous control also responds to the keyboard (arrows nudge, Shift = fine).
- Colour cues always have a second cue (flash duration, sound, text on Read).

## 8. Dr. Curie

Curie uses the same verbs through a `Puppet` input source (scripted pointer + timing).
Her demo of the titration is literally her hands doing §4 at a calm pace while she talks.
When the student struggles, she can take the *other* hand ("I'll swirl, you work the
tap"), the most real thing a lab manager does.

## 9. Architecture (where code goes)

```
lib/interact/
  kernel.ts       state machine, input routing, pointer capture, one held per hand
  input.ts        mouse / touch / keyboard / puppet → normalized gestures
  grabbable.ts    carry spring, constraints, set-down, drop/break
  vessel.ts       contents, pour curve, lip, slosh, spill
  dispenser.ts    valve → flow, drops vs stream
  control.ts      knobs/taps/sliders with detents
  tool.ts         tip contact actions
  sockets.ts      sockets, glow/magnet
  chemistry.ts    species, mixing, derived colour/pH
  feedback.ts     sound + haptics scaled by rates
lib/workbench/hands.ts   grips + IK (extend, don't replace)
```
Benches become thin: they create kit, declare classes/sockets and score from contents.
`BenchBase.perform(id)` tap-scripts are removed practical by practical as each moves over.

## 10. Checklist before merging any interaction

- [ ] Can the student do it wrong in the way real students do? Is it visible and scored?
- [ ] Is every value continuous where the real thing is continuous?
- [ ] Hands visibly hold/turn/press with the right grip; nothing floats.
- [ ] Works with mouse, touch and keyboard; assist mode works.
- [ ] Curie can perform it through `Puppet`.
- [ ] Sound and haptics scale with the action.
- [ ] `perf-budget` passes (desktop and `--mobile`), idle frame rate unchanged.
- [ ] Playwright test drives it through `input.ts` gestures (not by calling bench internals).

## 11. Rollout order

1. Kernel + input + grabbable + sockets, with the titration beaker/flask (carry, place,
   set down, collisions).
2. Vessel pour + slosh + contents/chemistry; burette fill by pouring.
3. Dispenser + control: burette tap with drops, swirl; full titration end-to-end; remove
   its old tap scripts.
4. Hands: grips + IK on top of the kernel; Curie `Puppet`.
5. Port flame tests, microscope, Ohm's law, then the four newer practicals.
6. Breakage, spills, assist mode polish, haptics.
