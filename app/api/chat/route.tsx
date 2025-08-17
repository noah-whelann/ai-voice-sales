import { NextResponse } from "next/server"
import OpenAI from "openai"
import { upsertCustomer, saveCall, getCustomerMemory } from "@/server/db"
import z from "zod"
const MODEL = process.env.OPENAPI_MODEL

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
})

const client = new OpenAI(({apiKey:process.env.OPENAI_API_KEY}))

export async function POST(req: request) {
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
        })}`
        } else {
            memorySummary = "No prior customer information."
        }

        const system = `
                        You are an expert and professional friendly car sales agent. Keep replies concise.
                        Politely gather: name, phone, email, car preferences (make/model/budget), when they want to buy, trade-in info.
                        Confirm this with the customer and summarize occasionally.
                        `;

        const chat = await client.chat.completions.create({
            model: MODEL,
            temperature: 0.6,
            messages: [
                { role: "system", content: system },
                ...(memory ? [{ role: "system", content: `Use these prior details as reference: ${memorySummary}` }] : []),
                { role: "user", content: userSpeech },
            ],
        });


        const assistant = chat.choices[0]?.message?.content ?? "Thank you! Could you share your name, email, and phone?";

        const extractor = `
                        Return ONLY a JSON object with keys:
                        {name, email, phone, car_preferences:{make, model, budget}, when_to_buy, trade_in, customer_notes}
                        Use the latest user message and prior memory below.
                        Prior memory: ${memorySummary}
                        `;
        const structured = await client.chat.completions.create({
            model: MODEL,
            temperature: 0.2,
            messages: [
                { role: "system", content: extractor },
                { role: "user", content: userSpeech || "" },
            ],
        });

        let lead: any = {};

        try{
            lead = LeadSchema.parse()
        }


    }



    return NextResponse.json({ assistant, lead});
}
