import { NextResponse } from "next/server";
import { getImageProviderConfig, setImageProviderConfig } from "@/lib/db";
import { IMAGE_PROVIDERS } from "@/lib/image-search";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = IMAGE_PROVIDERS.map((p) => {
    const cfg = getImageProviderConfig(p.id);
    const key = cfg?.api_key || null;
    return {
      id: p.id,
      label: p.label,
      hasKey: Boolean(key),
      masked: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    };
  });
  return NextResponse.json({ providers });
}

export async function PATCH(request) {
  const { providerId, apiKey } = await request.json();
  const known = IMAGE_PROVIDERS.find((p) => p.id === providerId);
  if (!known) {
    return NextResponse.json({ error: "Onbekende provider" }, { status: 400 });
  }
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({ error: "Geef een geldige API-key op" }, { status: 400 });
  }
  setImageProviderConfig(providerId, { api_key: apiKey.trim() });
  return NextResponse.json({ success: true });
}
