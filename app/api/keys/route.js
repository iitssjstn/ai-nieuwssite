import { NextResponse } from "next/server";
import { getApiKeys } from "@/lib/db";
import { createApiKey } from "@/lib/auth-node";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ keys: getApiKeys() });
}

export async function POST(request) {
  const { name } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const rawKey = createApiKey(name.trim());
  // De ruwe key is hierna nergens meer op te vragen — alleen de hash blijft
  // bewaard, net als bij wachtwoorden.
  return NextResponse.json({ key: rawKey }, { status: 201 });
}
