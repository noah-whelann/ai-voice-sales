export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import { z } from "zod";
import { upsertCustomer, saveCall, findCustomerByIdentity } from "@/server/db";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const LeadSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  car_preferences: z
    .object({
      make: z.string().nullish(),
      model: z.string().nullish(),
      budget: z.string().nullish(),
    })
    .partial()
    .nullish(),
  when_to_buy: z.string().nullish(),
  trade_in: z.string().nullish(),
  customer_notes: z.string().nullish(),
});

export async function POST(req: Request) {
  try {
    const { userSpeech, customerId } = (await req.json()) as {
      userSpeech: string;
      customerId?: number | string | null;
    };

    const memory =
      (await findCustomerByIdentity({
        id: customerId ? Number(customerId) : null,
      })) || null;

    const memorySummary = memory
      ? `Known so far: ${JSON.stringify(memory)}`
      : "No prior customer information.";

    const extractor = `
Return ONLY a JSON object with keys:
{name, email, phone, car_preferences:{make, model, budget}, when_to_buy, trade_in, customer_notes}
Use the latest user message and the prior memory below.
Prior memory: ${memorySummary}
    `.trim();

    const structured = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: extractor },
        { role: "user", content: userSpeech || "" },
      ] as ChatCompletionMessageParam[],
    });

    console.log("Extractor raw:", structured.choices[0]?.message?.content);

    let leadParsed: z.infer<typeof LeadSchema> | null = null;
    try {
      leadParsed = LeadSchema.parse(
        JSON.parse(structured.choices[0]?.message?.content || "{}"),
      );
    } catch {
      leadParsed = null;
    }

    const newInfo = {
      name: leadParsed?.name ?? null,
      email: leadParsed?.email ?? null,
      phone: leadParsed?.phone ?? null,
      car_preferences: leadParsed?.car_preferences ?? {},
      when_to_buy: leadParsed?.when_to_buy ?? null,
      trade_in: leadParsed?.trade_in ?? null,
      customer_notes: leadParsed?.customer_notes ?? null,
    };

    const merged = {
      name: memory?.name ?? newInfo.name ?? null,
      email: memory?.email ?? newInfo.email ?? null,
      phone: memory?.phone ?? newInfo.phone ?? null,
      car_preferences: memory?.car_preferences ?? newInfo.car_preferences ?? {},
      when_to_buy: memory?.when_to_buy ?? newInfo.when_to_buy ?? null,
      trade_in: memory?.trade_in ?? newInfo.trade_in ?? null,
      customer_notes: memory?.customer_notes ?? newInfo.customer_notes ?? null,
    };

    const saved = await upsertCustomer({
      name: newInfo.name ?? undefined,
      email: newInfo.email ?? undefined,
      phone: newInfo.phone ?? undefined,
      car_preferences: newInfo.car_preferences ?? undefined,
      when_to_buy: newInfo.when_to_buy ?? undefined,
      trade_in: newInfo.trade_in ?? undefined,
      customer_notes: newInfo.customer_notes ?? undefined,
    });

    const hasContact = Boolean(merged.email || merged.phone);
    const proceedCue = /\b(move on|next|all set|go ahead)\b/i.test(
      userSpeech || "",
    );

    type CarPreferences = {
      make?: string | null;
      model?: string | null;
      budget?: string | null;
    };

    const prefs = (merged.car_preferences as CarPreferences) || {};

    const intakeMissing: string[] = [];
    if (!merged.name) intakeMissing.push("your name");
    if (!hasContact) intakeMissing.push("your email or phone");
    if (!prefs.make) intakeMissing.push("preferred make");
    if (!prefs.model) intakeMissing.push("preferred model");
    if (!prefs.budget) intakeMissing.push("budget");
    if (!merged.when_to_buy) intakeMissing.push("when you want to buy");
    if (!merged.trade_in) intakeMissing.push("whether you have a trade-in");

    const readyToRecommend =
      proceedCue || hasContact || intakeMissing.length === 0;

    let assistant: string;
    if (!readyToRecommend) {
      const askNow = intakeMissing.slice(0, 2).join(" and ");
      assistant = `Got it. Could you share ${askNow}?`;
    } else {
      const recSystem = `
      You are a concise, friendly car sales agent.
      Customer profile: ${JSON.stringify(merged)}

      Confirm key preferences and suggest 2–3 options.
      For each option: model + 1 short reason.
      End with a question to refine or choose.
      `.trim();

      const rec = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.6,
        messages: [
          { role: "system", content: recSystem },
          { role: "user", content: userSpeech || "" },
        ],
      });

      console.log("LLM rec raw:", rec.choices[0]?.message?.content);

      assistant =
        rec.choices[0]?.message?.content ??
        "Great—shall we look at SUVs, sedans, or trucks first?";
    }

    await saveCall({
      email: merged.email,
      phone: merged.phone,
      transcript: [
        { role: "user", content: userSpeech || "" },
        { role: "assistant", content: assistant },
      ],
    });

    return NextResponse.json({
      assistant,
      lead: merged,
      customerId: saved?.id ?? customerId ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
