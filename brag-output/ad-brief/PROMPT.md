# LabBridge — Spec Ad Brief (v1, for approval)

**Format:** ~18 s ad + ~2 s "made by / riccardo bosso" end card (Spotify end card v2) · 60 fps · 16:9 master, 9:16 recut
**Reference:** Zelios LangEase launch ad. We take its *grammar*: a dark 3D stage, floating translucent windows, motion-blurred camera whips, and a tactile sound on every reveal. We don't copy its moves.
**Look:** Spotify/Shopify/Huel family. Near-black stage (#07090c), soft drifting **teal → amber glow** (LabBridge's highlight colours) behind every window, SF Pro Display kinetic type, glass panels with 1 px inner light, heavy directional blur on every camera shift. No illustrations, no cartoons, no flat vectors.

---

## 1. Three ideas (my pick: **A**)

**A — "The lab that fits in a tab."** *(recommended)*
Real LabBridge UI modules (the 3D bench, the burette lens, the lab sheet, Dr. Curie's coach card) fly out of a browser window onto the dark stage and assemble into a full working lab. Core features shown: **hands-on titration** and **Dr. Curie coaching you**.

**B — "Every drop counts."**
A macro, single-take story around one titration: the tap turns, a drop falls, the flask flashes pink, the reading is written, the sheet is marked. UI panels orbit the action. One feature, very deep.

**C — "No lab? No problem."**
Contrast. Cold text ("No equipment.", "No lab.", "No second chance.") shatters into eight practicals, then fans out as floating windows. Wider, less tactile.

---

## 2. Beat sheet — Idea A (timings are provisional; they get re-timed to the chosen VO take)

| # | Time | Picture | Type on screen | Sound |
|---|------|---------|----------------|-------|
| 1 | 0.00–1.6 | Black. The glow breathes on. One browser window slides up from depth (z-push, blur trail). | — | Sub swell → glass "tick" as the window lands |
| 2 | 1.6–3.6 | Camera whips *into* the window (radial blur) and we're inside the 3D lab, crosshair centred. | **A real lab.** | Whoosh in → low hit on the word |
| 3 | 3.6–6.4 | The lab breaks apart: the burette, the flask and the bench split into 3 floating glass panels, rotating in parallax. | **In your browser.** | Three stacked whooshes, three "clicks" on each landing |
| 4 | 6.4–9.6 | Feature 1. A hand turns the tap; the drop count ticks; the flask flashes pink. The burette lens panel slides in and its meniscus settles. | **Turn the tap. Read the scale.** | Tactile knob click per detent, a soft drip per drop, a riser into the pink flash |
| 5 | 9.6–12.8 | Feature 2. Dr. Curie's coach card floats in beside the bench; her line types out; the amber "NEXT" marker pulses on the funnel. | **A lab manager who's always there.** | UI blip per typed word (sitting under the VO), a pulse "thump" on NEXT |
| 6 | 12.8–15.4 | Eight practical cards (microscope, Ohm's law, flame test, pendulum…) cascade into a curved wall. The camera dollies back with motion blur. | **Eight practicals. Real marks.** | A rapid whoosh ladder of 8, then a hit when the wall locks |
| 7 | 15.4–18.0 | Everything collapses into the LabBridge wordmark and URL; the glow settles. | **LabBridge** · labbridge.vercel.app | Logo hit + shimmer; the last chord rings |
| 8 | 18.0–20.0 | End card: "made by / riccardo bosso" (Spotify end card v2) | — | The chord tail under it |

**9:16:** same beats. Panels stack vertically, type is set larger, and the wall of practicals becomes a vertical carousel.

---

## 3. Script (VO, ~38 words, for about 15 s of speech)

> "This is a real science lab. And it lives in your browser.
> Turn the tap. Watch for the pink. Read the scale yourself.
> Doctor Curie guides every step.
> Eight practicals. Real marks.
> LabBridge."

Respelling for ElevenLabs: **"Lab Bridge"** (two clear words); **"Doctor Kyoo-ree"**.

---

## 4. Voice (ElevenLabs, 2 takes in one call each)

- **Jessica:** warm, young, conversational. Best for students. *My pick.*
- **Lauren:** calm and premium; very "Apple".
- **Siren:** more cinematic, with an edge.

**Credit estimate:** about 230 characters × 2 takes × 3 voices ≈ **1.4 k credits** for auditions. The final take is reused, so no further cost.

---

## 5. Music (original, made in code)

- 104 BPM. Minimal pulse in D minor that resolves to F major on the logo.
- Felt-piano ostinato, a sub-bass pulse and airy pads, with a lift at beat 6.
- Ducked at least **15 dB under the VO** whenever words are spoken (sidechain envelope, not a limiter).
- The last chord rings about 3 s under the end card.
- Master at **-14 LUFS integrated / -1 dBTP**, with the VO kept unsquashed.

---

## 6. SFX plan

All SFX come only from **FOUR Editors Sound Effects**.
- A whoosh into every word and title, and a hit on every landing.
- A click or tick on each panel move, plus knob detents, drips, a riser and a logo hit/shimmer.
- Each one is EQ'd, placed and panned to its window's position.
- About 45–55 events in total.

---

## 7. Assets list (nothing is downloaded without your OK)

1. **LabBridge UI captures** rendered from the real app: the titration bench, burette lens, lab sheet, Curie coach card, NEXT marker, practical scenes. I'll capture these headless at 60 fps from my own build, not from your screen.
2. **LabBridge wordmark/logo** from the repo (`public/`). Is there an official logo file, or should I set it in SF Pro Display?
3. **Dr. Curie character render** from the in-app model.
4. **SF Pro Display** font. Licensing is fine for Apple-platform use; for a spec ad I'll use your local copy, or Inter Display as a fallback.
5. Photos: none planned (everything is product UI). If any are needed, I'll ask first and log them in `assets_in/CREDITS.md`.

---

## ⚠️ Blockers before "go"

- **SFX SSD:** `/Volumes/Extreme Pro/...` isn't reachable from my cloud container. Please upload the SFX folder, or the subset you like, into this session.
- **ElevenLabs:** I need an API key set as an environment secret, never pasted into chat.
- **Fields you left blank:** I've assumed *you write it*, Idea A, Jessica, ~18 s. Tell me about anything to **avoid**.
