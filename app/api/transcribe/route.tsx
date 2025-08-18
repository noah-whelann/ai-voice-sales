export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const result = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return NextResponse.json({ text: result.text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "transcribe error" }, { status: 500 });
  }
}
