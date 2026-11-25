import { GoogleGenAI, Type, type FunctionDeclaration, type Content } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const STATIONS = ['biology', 'osmosis', 'chemistry', 'rates', 'chroma', 'hood', 'research', 'physics', 'pendulum'];

// What Dr. Curie can do in the lab. The client checks and performs them.
const tools: FunctionDeclaration[] = [
  {
    name: 'walk_to',
    description: 'Walk over to a bench (to supervise, point something out, or demonstrate).',
    parameters: { type: Type.OBJECT, properties: { station: { type: Type.STRING, enum: STATIONS } }, required: ['station'] },
  },
  {
    name: 'highlight',
    description: 'Make one piece of apparatus glow so the student can find it. Use this to show what to click next.',
    parameters: { type: Type.OBJECT, properties: { station: { type: Type.STRING, enum: STATIONS }, part: { type: Type.STRING, description: 'An apparatus id from the knowledge list' } }, required: ['station', 'part'] },
  },
  {
    name: 'use_apparatus',
    description:
      'Operate one piece of apparatus for the student, exactly as if they clicked it (e.g. fill the burette, close the tap, focus the microscope). Use it when the student asks you to show them or do it, or for safety. Say what you did and why.',
    parameters: { type: Type.OBJECT, properties: { station: { type: Type.STRING, enum: STATIONS }, part: { type: Type.STRING, description: 'An apparatus id from the knowledge list' } }, required: ['station', 'part'] },
  },
];

const systemInstruction = `You are Dr. Curie, the lab manager of LabBridge, a 3D school science lab. You walk the lab floor as a character.
Your students are 13-18 year olds, many in Nigeria, many without access to a real lab. Write at a simple reading level: short sentences, everyday words, one idea per sentence. 2-3 sentences unless asked for more.
Every message comes with LIVE LAB STATE and a KNOWLEDGE list of the practicals (and the active one in detail). Use them: refer to the real readings and the current step.
How you teach:
- Guide the student to the next step and explain WHY it is done that way.
- When they make a mistake, say what it does to the result, then how to fix it.
- Safety comes first, always.
- Never give away a measured answer (a titre, R, g, an Rf value, a mass). Ask a guiding question instead.
- If they ask something off-topic, answer in one friendly line, then bring them back to the practical.
- You can act: highlight shows them what to click; use_apparatus does it for them. If they ask "show me" or "do it for me", do it with use_apparatus and explain each action. Otherwise prefer highlight so they learn by doing.
- If ASSISTANCE is independent, keep quiet unless asked or unsafe.`;

// ---- Abuse guard: a small per-client budget (in memory; enough for a single region deployment)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();
function allowed(key: string) {
  const t = Date.now();
  const list = (hits.get(key) ?? []).filter((x) => t - x < WINDOW_MS);
  if (list.length >= MAX_REQUESTS) return false;
  list.push(t);
  hits.set(key, list);
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
  return true;
}

export async function POST(req: NextRequest) {
  let body: { messages?: ChatTurn[]; labState?: string; knowledge?: string; event?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!allowed(ip)) return NextResponse.json({ error: 'Too many questions at once. Give it a few minutes.' }, { status: 429 });

  const messages = (body.messages || []).slice(-12).map((m) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));
  if (!messages.length && !body.event) {
    return NextResponse.json({ error: 'messages or event is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Dr. Curie is offline: GEMINI_API_KEY is not configured on the server.' },
      { status: 503 }
    );
  }

  const contents: Content[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const liveContext = `[KNOWLEDGE]\n${String(body.knowledge || '').slice(0, 6000)}\n\n[LIVE LAB STATE]\n${String(body.labState || 'unknown').slice(0, 4000)}`;
  if (body.event) {
    contents.push({ role: 'user', parts: [{ text: `${liveContext}\n\n[LAB EVENT - react as lab manager, briefly] ${body.event}` }] });
  } else {
    const last = contents[contents.length - 1];
    last.parts = [{ text: `${liveContext}\n\n${messages[messages.length - 1].content}` }];
  }

  // Streamed as newline-delimited JSON: {"text": "..."} chunks, then {"actions": [...]}
  const ai = new GoogleGenAI({ apiKey });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      const actions: { name?: string; args: Record<string, unknown> }[] = [];
      try {
        const res = await ai.models.generateContentStream({
          model: MODEL,
          contents,
          config: { systemInstruction, temperature: 0.5, maxOutputTokens: 400, tools: [{ functionDeclarations: tools }] },
        });
        for await (const chunk of res) {
          if (chunk.text) send({ text: chunk.text });
          for (const c of chunk.functionCalls ?? []) actions.push({ name: c.name, args: (c.args as Record<string, unknown>) || {} });
        }
        send({ actions });
      } catch (error) {
        console.error('Dr. Curie request failed:', error);
        send({ error: 'Dr. Curie could not respond.' });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
}
