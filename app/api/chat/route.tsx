import { NextResponse } from "next/server"
import OpenAI from "openai"
import { upsertCustomer, saveCall, getCustomerMemory } from "@/server/db"

export async function POST(req: request) {
    const { userSpeech, customerId } = await req.json();


    return NextResponse.json({ assistant, lead});
}
