import { NextResponse } from "next/server"
import OpenAI from "openai"
import { upsertCustomer, saveCall, getCustomerMemory } from "@/server/db"
import z from "zod"

const LeadScheme = z.object({
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
    }




    return NextResponse.json({ assistant, lead});
}
