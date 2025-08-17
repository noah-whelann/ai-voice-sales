import { NextResponse } from "next/server";
import OpenAI from "openai";
import { upsertCustomer, saveCall, getCustomerMemory } from "@/server/db";
import { z } from "zod";
import { ChatCompletionMessageParam } from "openai/resources";
const MODEL: string = process.env.OPENAPI_MODEL || "gpt-5-mini";

const LeadSchema = z.object({
  name: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  car_preferences: z.object({
    make: z.string().nullish(),
    model: z.string().nullish(),
    budget: z.string().nullish(),
  }),
  when_to_buy: z.string().nullish(),
  trade_in: z.string().nullish(),
  customer_notes: z.string().nullish(),
});

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userSpeech, customerId } = await req.json();

    // Check if the customer is already in our database
    const memory = customerId ? await getCustomerMemory(customerId) : null;

    let memorySummary;

    if (memory) {
      memorySummary = `Known so far: ${JSON.stringify({
        name: memory.name,
        email: memory.email,
        phone: memory.phone,
        car_preferences: memory.car_preferences || {},
        when_to_buy: memory.when_to_buy,
        trade_in: memory.trade_in,
        customer_notes: memory.customer_notes,
      })}`;
    } else {
      memorySummary = "No prior customer information.";
    }

    const system = `
                        You are an expert and professional friendly car sales agent. Keep replies concise.
                        Politely gather: name, phone, email, car preferences (make/model/budget), when they want to buy, trade-in info.
                        Confirm this with the customer and summarize occasionally.
                        `;

    const chatMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...(memory
        ? [
            {
              role: "system",
              content: `Use prior details: ${memorySummary}`,
            } as const,
          ]
        : []),
      { role: "user", content: userSpeech || "" },
    ];

    const chat = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: chatMessages,
    });

    const assistant =
      chat.choices[0]?.message?.content ??
      "Thank you! Could you share your name, email, and phone?";

    const extractor = `
                    Return ONLY a JSON object with keys:
                    {name, email, phone, car_preferences:{make, model, budget}, when_to_buy, trade_in, customer_notes}
                     Use the latest user message and prior memory below.
                    Prior memory: ${memorySummary}
                    `;

    const extractMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: extractor },
      { role: "user", content: userSpeech || "" },
    ];

    const structured = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: extractMessages,
    });

    let leadParsed = null;
    try {
      leadParsed = LeadSchema.parse(
        JSON.parse(structured.choices[0]?.message?.content || "{}")
      );
    } catch {}

    const leadForDb =
      leadParsed && Object.keys(leadParsed).length
        ? {
            name: leadParsed.name ?? null,
            email: leadParsed.email ?? null,
            phone: leadParsed.phone ?? null,
            when_to_buy: leadParsed.when_to_buy ?? null,
            trade_in: leadParsed.trade_in ?? null,
            notes: leadParsed.customer_notes ?? null,
            preferences: leadParsed.car_preferences ?? {},
          }
        : null;

    if (leadForDb) {
      await upsertCustomer(leadForDb);
    }

    await saveCall({
      email: leadForDb?.email ?? memory?.email,
      phone: leadForDb?.phone ?? memory?.phone,
      transcript: [
        { role: "user", content: userSpeech || "" },
        { role: "assistant", content: assistant },
      ],
    });

    const lead = leadParsed ?? {};
    return NextResponse.json({ assistant, lead });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "error" },
      { status: 500 }
    );
  }
}
