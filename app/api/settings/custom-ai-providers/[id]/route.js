import { NextResponse } from "next/server";
import { getCustomAiProviders, setCustomAiProviders } from "@/lib/db";

export async function DELETE(request, { params }) {
  const existing = getCustomAiProviders();
  setCustomAiProviders(existing.filter((p) => p.id !== params.id));
  return NextResponse.json({ success: true });
}
