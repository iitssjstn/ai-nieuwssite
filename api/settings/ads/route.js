import { NextResponse } from "next/server";
import { getAdsenseClientId, setAdsenseClientId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ clientId: getAdsenseClientId() });
}

export async function PATCH(request) {
  const { clientId } = await request.json();
  if (!clientId || !clientId.trim()) {
    return NextResponse.json({ error: "Geef een geldige client-ID op" }, { status: 400 });
  }
  if (!/^ca-pub-\d+$/.test(clientId.trim())) {
    return NextResponse.json(
      { error: "Client-ID moet het formaat ca-pub-XXXXXXXXXX hebben" },
      { status: 400 }
    );
  }
  setAdsenseClientId(clientId.trim());
  return NextResponse.json({ success: true });
}
