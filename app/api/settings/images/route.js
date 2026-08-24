import { NextResponse } from "next/server";
import { getImageProviderConfig, setImageProviderConfig, getCustomImageProviders } from "@/lib/db";
import { IMAGE_PROVIDERS } from "@/lib/image-search";

export const dynamic = "force-dynamic";

export async function GET() {
  const allProviders = [...IMAGE_PROVIDERS, ...getCustomImageProviders()];
  const providers = allProviders.map((p) => {
    const cfg = getImageProviderConfig(p.id);
    const key = cfg?.api_key || null;
    return {
      id: p.id,
      label: p.label,
      hasKey: Boolean(key),
      masked: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
      custom: !IMAGE_PROVIDERS.some((b) => b.id === p.id),
    };
  });
  return NextResponse.json({ providers });
}

export async function PATCH(request) {
  const { providerId, apiKey } = await request.json();
  const allProviders = [...IMAGE_PROVIDERS, ...getCustomImageProviders()];
  const known = allProviders.find((p) => p.id === providerId);
  if (!known) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({ error: "Provide a valid API key" }, { status: 400 });
  }
  setImageProviderConfig(providerId, { api_key: apiKey.trim() });
  return NextResponse.json({ success: true });
}
