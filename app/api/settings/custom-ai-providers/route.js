import { NextResponse } from "next/server";
import { getCustomAiProviders, setCustomAiProviders } from "@/lib/db";
import { PROVIDERS } from "@/lib/ai";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { label, base_url, default_model } = await request.json();

  if (!label || !label.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!base_url || !/^https?:\/\/.+/.test(base_url)) {
    return NextResponse.json(
      { error: "Base URL must start with http:// or https:// — the part before /chat/completions, e.g. https://api.example.com/v1" },
      { status: 400 }
    );
  }

  const existing = getCustomAiProviders();
  const allIds = [...PROVIDERS.map((p) => p.id), ...existing.map((p) => p.id)];
  let id = `custom-${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (allIds.includes(id)) id = `custom-${crypto.randomUUID().slice(0, 8)}`;

  const provider = {
    id,
    label: label.trim(),
    // Zonder een afsluitende slash op te slaan, zodat de latere
    // ${baseUrl}/chat/completions-samenvoeging in callOpenAICompatible
    // nooit per ongeluk een dubbele slash oplevert.
    base_url: base_url.trim().replace(/\/+$/, ""),
    default_model: default_model?.trim() || null,
  };

  setCustomAiProviders([...existing, provider]);
  return NextResponse.json(provider, { status: 201 });
}
