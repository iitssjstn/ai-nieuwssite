import { NextResponse } from "next/server";
import { getProviderConfig, setProviderConfig, getCustomAiProviders } from "@/lib/db";
import { PROVIDERS } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const allProviders = [...PROVIDERS, ...getCustomAiProviders()];
  const providers = allProviders.map((p) => {
    const cfg = getProviderConfig(p.id);
    const key = cfg?.api_key || null;
    return {
      id: p.id,
      label: p.label,
      defaultModel: p.defaultModel || p.default_model || null,
      model: cfg?.model || null,
      hasKey: Boolean(key),
      masked: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
      custom: !PROVIDERS.some((b) => b.id === p.id),
      baseUrl: p.base_url || null,
    };
  });
  return NextResponse.json({ providers });
}

export async function PATCH(request) {
  const { providerId, apiKey, model } = await request.json();

  const allProviders = [...PROVIDERS, ...getCustomAiProviders()];
  const known = allProviders.find((p) => p.id === providerId);
  if (!known) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  if (apiKey !== undefined && !apiKey.trim()) {
    return NextResponse.json({ error: "Provide a valid API key" }, { status: 400 });
  }

  setProviderConfig(providerId, {
    api_key: apiKey !== undefined ? apiKey.trim() : undefined,
    model: model !== undefined ? (model.trim() || null) : undefined,
  });
  return NextResponse.json({ success: true });
}
