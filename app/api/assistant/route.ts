import { GoogleGenAI, Type, type FunctionDeclaration, type Content } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Actions Dr. Curie may take in the lab. The client validates and applies them to the lab store.
const tools: FunctionDeclaration[] = [
  {
    name: 'set_microscope_objective',
    description: 'Rotate the microscope turret to an objective lens.',
    parameters: {
      type: Type.OBJECT,
      properties: { objective: { type: Type.STRING, enum: ['4x', '10x', '40x', '100x'] } },
      required: ['objective'],
    },
  },
  {
    name: 'set_burette',
    description: 'Open or close the burette stopcock at the chemistry bench.',
    parameters: { type: Type.OBJECT, properties: { open: { type: Type.BOOLEAN } }, required: ['open'] },
  },
  {
    name: 'add_indicator',
    description: 'Add phenolphthalein indicator to the titration flask.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'set_stirrer',
    description: 'Set the magnetic stirrer speed.',
    parameters: { type: Type.OBJECT, properties: { rpm: { type: Type.NUMBER, description: 'One of 0, 400 or 800' } }, required: ['rpm'] },
  },
  {
    name: 'set_circuit_switch',
    description: 'Close or open the knife switch on the physics circuit.',
    parameters: { type: Type.OBJECT, properties: { closed: { type: Type.BOOLEAN } }, required: ['closed'] },
  },
  {
    name: 'set_resistance',
    description: 'Set the potentiometer resistance in ohms (10-100).',
    parameters: { type: Type.OBJECT, properties: { ohms: { type: Type.NUMBER } }, required: ['ohms'] },
  },
  {
    name: 'go_to_station',
    description: 'Walk over to a workstation to supervise or demonstrate.',
    parameters: {
      type: Type.OBJECT,
      properties: { station: { type: Type.STRING, enum: ['biology', 'chemistry', 'physics', 'research'] } },
      required: ['station'],
    },
  },
];

const systemInstruction = `You are Dr. Curie, the lab manager of the LabBridge virtual science laboratory. You are a physical character walking the lab floor.
You supervise students at four benches: biology (microscopy), chemistry (acid-base titration), physics (DC circuits) and research (analytical balance, centrifuge).
You receive a live snapshot of every instrument with each message. Use it: refer to actual readings, spot mistakes (e.g. burette left open past the 25 mL endpoint, focusing at 100x without oil) and give the next concrete step.
Enforce lab safety like a real lab manager. Be warm but concise: 2-4 sentences unless asked for detail.
You may use tools to demonstrate or fix the setup, but prefer guiding the student to do it themselves; only act when asked or when safety requires it. Always say what you did.`;

export async function POST(req: NextRequest) {
  let body: { messages?: ChatTurn[]; labState?: string; event?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = (body.messages || []).slice(-20);
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

  const liveContext = `[LIVE LAB STATE]\n${body.labState || 'unknown'}`;
  if (body.event) {
    contents.push({ role: 'user', parts: [{ text: `${liveContext}\n\n[LAB EVENT - react as lab manager, briefly] ${body.event}` }] });
  } else {
    const last = contents[contents.length - 1];
    last.parts = [{ text: `${liveContext}\n\n${messages[messages.length - 1].content}` }];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction, temperature: 0.6, tools: [{ functionDeclarations: tools }] },
    });

    const actions = (response.functionCalls || []).map((c) => ({ name: c.name, args: c.args || {} }));
    let text = response.text || '';
    if (!text && actions.length) text = 'Let me set that up for you.';

    return NextResponse.json({ text, actions });
  } catch (error) {
    console.error('Dr. Curie request failed:', error);
    return NextResponse.json({ error: 'Dr. Curie could not respond. Check the server logs.' }, { status: 502 });
  }
}
