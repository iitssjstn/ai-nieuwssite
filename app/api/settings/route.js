import { NextResponse } from "next/server";
import { getGoogleApiKey, setGoogleApiKey } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = getGoogleApiKey();
  return NextResponse.json({
    hasKey: Boolean(key),
    masked: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
  });
}

export async function PATCH(request) {
  const { googleApiKey } = await request.json();
  if (!googleApiKey || !googleApiKey.trim()) {
    return NextResponse.json({ error: "Geef een geldige API-key op" }, { status: 400 });
  }
  setGoogleApiKey(googleApiKey.trim());
  return NextResponse.json({ success: true });
}
