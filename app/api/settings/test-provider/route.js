import { NextResponse } from "next/server";
import { testAiProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { providerId } = await request.json();
  if (!providerId) {
    return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  }
  try {
    const result = await testAiProvider(providerId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
