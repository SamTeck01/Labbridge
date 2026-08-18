import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Graceful offline fallback response if API key is not configured
      return NextResponse.json({
        text: `[LabBridge Mentor Simulation] Regarding your observation: In scientific laboratory microscopy and experimental practice, clear visual differentiation of cellular organelles (such as the cell wall, nucleus, and chloroplasts) or chemical titration end-points requires strict adherence to focal plane calibration and stoichiometric indicators. When examining specimen slides, start at 4x or 10x scanning power to locate the specimen field before advancing to 40x high-power magnification with fine-focus adjustments.`,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are "Dr. Curie", the expert AI Science Laboratory Assistant inside the LabBridge Virtual Science Laboratory simulator.
Your job is to provide clear, inspiring, precise, and scientifically accurate explanations to students exploring practical biology (microscopy, cell structures, histology), chemistry (titration, stoichiometry, combustion), physics (circuits, optics, Ohm's law), and scientific methods.
Keep your explanations concise, engaging, and directly applicable to what the student is observing in the lab.`;

    const fullPrompt = context
      ? `Laboratory Context: ${context}\n\nStudent Question: ${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Error generating AI assistant response:', error);
    return NextResponse.json(
      {
        text: 'Dr. Curie is currently reviewing experimental lab notes. Please verify your microscope focus settings or check the laboratory protocol manual.',
      },
      { status: 200 }
    );
  }
}
