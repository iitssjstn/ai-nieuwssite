import { NextResponse } from "next/server";
import { getCustomImageProviders, setCustomImageProviders } from "@/lib/db";

export async function DELETE(request, { params }) {
  const existing = getCustomImageProviders();
  setCustomImageProviders(existing.filter((p) => p.id !== params.id));
  return NextResponse.json({ success: true });
}
