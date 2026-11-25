# Dr. Curie: full plan (draft for approval)

## 1. What she is for
Dr. Curie is the lab manager who stands beside a student who has never had lab access. Her job, in order:
1. **Keep the student safe**: goggles, the fume-hood sash, the gas, overcurrent, glassware.
2. **Teach the method**: the next step, and *why* it is done that way.
3. **Explain mistakes**: what went wrong, what it does to the result, and how to recover.
4. **Fade out**: guide on the first attempt, give hints on the second, then only watch.
5. **Test understanding**: short "why?" questions, and exam-style questions at the end.

She never does the practical for the student. Every action she takes in the lab is either a demonstration the student asked for or a safety intervention.

## 2. Problems today (from the code and the tests)

| # | Problem | Where |
|---|---|---|
| P1 | The system prompt describes 4 benches; there are 9 practicals. She doesn't know about flame tests, rates, chromatography, osmosis or the pendulum. | `app/api/assistant/route.ts` systemInstruction |
| P2 | Her tools cover only 4 benches, and `go_to_station` only lists 4 stations. | same file, `tools` |
| P3 | She can operate equipment for the student (`set_burette`, `tare_balance` and so on), which undermines learning. | tools and `lib/curie.ts` `operate()` |
| P4 | With no API key or no network she is just "offline". No help at all appears. | route returns 503; `curie.ts` request |
| P5 | Every lab event is a full Gemini call. That is slow (1–3 s) and costs money at scale. | `curie.ts` `startCurieWatch` |
| P6 | Replies don't stream, so long answers appear all at once after a wait. | route plus `request()` |
| P7 | There is no rate limit or abuse guard on `/api/assistant`, so anyone can burn the key. | route |
| P8 | She has no memory across sessions (past mistakes, which practicals are done). | — |
| P9 | She has no voice. A large share of target students prefer listening, and reading is hard for weaker readers. | — |
| P10 | Off-topic questions and "just give me the answer" requests aren't handled by any rule. | prompt |
| P11 | The chat modal and the speech bubble are two separate surfaces, with no history in the bubble. | `AILabAssistantModal.tsx`, NPC bubble |

## 3. Design

### 3.1 Two brains: instant local and smart remote
- **Local coach (new, `lib/curieLocal.ts`)**: no network, instant, free. It reacts to every lab event using data we already have: step `coach` text, step `why`, mistake `consequence` and `fix`, and the safety rules. About 90% of what she says during a practical comes from here, so she works offline and costs nothing.
- **Remote tutor (Gemini, as today)**: used only when the student types or speaks a question, at the end-of-practical debrief, and for "explain it differently". Calls receive a compact lab state, so they stay cheap.
- **Fallback**: if the remote call fails, the local coach answers from its knowledge base (step, why, mistake) and says "I'm offline, so here's the short version".

### 3.2 What she knows (single source of truth)
- The prompt is generated from `experiments.ts` and `practicalMeta.ts`: all 9 practicals, their steps, why text, mistakes and expected values. It is never hand-written again, so it can't go stale (fixes P1).
- Lab state is per practical, current station only, under about 600 tokens.
- Student profile: assistance level, past mistakes per practical, and best scores, from localStorage.

### 3.3 Behaviour rules (the prompt contract)
- 2–3 short sentences in plain English at a JSS3 reading level, with one idea per sentence.
- Never give the numeric answer to a measurement (titre, R, g, Rf). Ask a guiding question instead.
- Off-topic questions get one friendly line, then she brings the student back to the practical.
- Safety overrides everything.
- At assistance level **independent** she speaks only for safety or when asked.

### 3.4 Actions: from "does it" to "shows it" (fixes P3)
Replace the operate-equipment tools with teaching tools:
- `highlight(id)`: makes the next piece of apparatus glow, using the hover outline that already exists.
- `walk_to(station)`: all 9 stations.
- `demonstrate(stepId)`: plays the step's animation once as a "ghost" run, then **resets** it, so the student still does it themselves. Only when asked.
- `show_close_up(kind)`: opens the burette, meter or rule close-up to teach reading it.
- `safety_stop(reason)`: the only tool allowed to change state, e.g. closing the gas or opening the switch, and only for a safety mistake.

### 3.5 Moments she speaks
| Moment | Source | Example |
|---|---|---|
| Arriving at a bench | local | "This is the titration bench. Goggles first." |
| Each step done (guided) | local | Next step plus a one-line why. |
| Idle for 45 s on a step | local, and only one nudge | "Stuck? The NaOH bottle is glowing; click it." plus a highlight |
| Mistake | local | Consequence, then the fix (from the mistake metadata). |
| Safety | local, instant, can't be dismissed | "Stop. Sash down before you light the burner." |
| Student question | remote | — |
| Debrief | remote | 3 strengths and 1 thing to improve, plus 2 exam-style questions with feedback. |

### 3.6 Voice (P9)
- **Phase 1:** browser `speechSynthesis`. Free, works offline, on by default with a mute toggle. The speech bubble text is read aloud.
- **Phase 2 (optional):** push-to-talk with the Web Speech API in Chrome and Android, so the student can ask questions without typing.
- **Phase 3 (optional):** a nicer neural voice. The Kokoro voice from the ad can be pre-rendered for the fixed local lines and served as small MP3s.

### 3.7 One conversation surface (P11)
- The speech bubble shows the latest line.
- Tapping it expands to a side drawer with the history, the input box and the mic. This replaces the modal.
- The drawer is a bottom sheet on phones and never covers the current step or the apparatus.

### 3.8 Server hardening (P5–P7)
- **Streaming responses** (`generateContentStream`), so text appears word by word.
- **Rate limit:** per IP and session, e.g. 20 questions per 10 minutes, using in-memory LRU with Vercel's IP header. Upgrade to Upstash or KV later.
- **Input checks:** length limit; history trimmed to 8 turns; the lab state is built on the server from a typed object, not free text.
- **Cost:** about 1 remote call per question instead of 1 per event, roughly a 10× reduction.

### 3.9 Memory (P8)
- **Now:** a localStorage profile (mistakes per practical, levels, the last debrief). Curie opens with "Last time you overshot the endpoint, so go dropwise from 24 mL".
- **Later:** this syncs to a backend when teacher mode exists (Supabase or AWS DynamoDB; the AWS option is relevant to the pitch-a-thon).

### 3.10 Curie is how you choose a practical (your request)
- She stands at a **front desk**, near where the student spawns, and walks back there between jobs.
- **Walk up to her** (within about 2 m and facing her): a small glassy prompt fades in above her head with the label **"Talk to Dr. Curie"**. On a laptop it's a button plus `E`; on a phone it's a big tap target.
- **The button opens the Practical modal**, the library rebuilt around her:
  - a left rail with subjects;
  - cards with difficulty, time and best score;
  - a short "why this matters" line;
  - one primary button, **"Start with Dr. Curie"**.
- **On Start:**
  - she says one line ("Titration. Follow me.");
  - she walks to the right table, and the camera follows her there and seats the student;
  - she checks goggles, then the brief begins.
- The floating "Practicals" HUD button stays as a shortcut, but it opens the same modal, so there is one place to choose.
- **Also from the prompt:** "Ask a question", which opens her chat drawer, and "Where was I?", which resumes the last unfinished practical.

### 3.11 Four tables instead of ten
There are currently 4 main benches, 4 side benches and the fume hood, all built at once. The new layout has **4 tables**:

| Table | Practicals that load on it |
|---|---|
| Biology | Microscopy, Osmosis |
| Chemistry | Titration, Rates, Chromatography |
| Physics | Ohm's law, Pendulum |
| Analytical | Weighing, plus Flame tests in a bench-top fume cupboard on the same table |

- Each table shows only the apparatus for the **chosen** practical. The other rigs aren't built until they're needed, and are disposed of when you switch.
- This removes the side benches and the back-wall hood, so the room feels like a real teaching lab, with less walking and fewer things to click by mistake.
- **Performance bonus:** only one practical's geometry, textures and hand targets are live at a time, so expect roughly 60–70% fewer draw calls and much less GPU memory. This is a big win for cheap phones.
- With no practical chosen, each table shows a neat "tidy bench" (tray and stool), and Curie's desk is the obvious place to go.

## 4. Delivery phases

| Phase | Contents | Size |
|---|---|---|
| **0. Curie desk and 4 tables** | NPC desk, proximity prompt, Practical modal, walk-and-seat flow (3.10); 4-table layout with per-practical apparatus loaded and disposed (3.11) | ~1–2 days |

| **1. Foundations** | Generated prompt with all 9 practicals (P1, P2); local coach with offline fallback (P4, P5); rate limit and input checks (P7); answer-withholding and off-topic rules (P10) | ~1 day |
| **2. Teaching tools** | `highlight`, `walk_to` (9 stations), `show_close_up`, `safety_stop`; remove operate tools (P3); idle nudges | ~1 day |
| **3. Voice and surface** | `speechSynthesis` with mute; bubble-to-drawer conversation; streaming (P6, P9, P11) | ~1 day |
| **4. Debrief and memory** | End-of-practical debrief with exam questions; localStorage profile and "last time…" openers (P8) | ~1 day |
| **5. Optional** | Push-to-talk, pre-rendered neural voice, `demonstrate` ghost runs, backend sync | later |

## 5. How we'll test it
- Playwright: every practical runs with **no API key**, and Curie still gives correct step, mistake and safety lines.
- Unit checks: the generated prompt contains every practical and step id; no tool can change state except `safety_stop`.
- Scripted questions with an API key: "just tell me the titre" must not reveal it; an off-topic question gets redirected; a safety event always wins.
- Phone check: the drawer never overlaps the step panel at 844×390 or 360×640.

## 6. Decisions needed from you
1. Remove her ability to operate equipment, except safety stops? (Recommended: yes.)
2. Voice on by default, or off by default with a speaker button? (Recommended: on, with one tap to mute.)
3. Keep Gemini, or move the remote brain to Amazon Bedrock for the AWS pitch? (Recommended: keep Gemini now and design a swappable provider.)
4. Start with phases 0–3 now? Phase 0 (the Curie desk and the 4 tables) comes first. (Recommended: yes.)
