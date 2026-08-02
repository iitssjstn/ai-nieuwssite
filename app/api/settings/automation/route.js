import { NextResponse } from "next/server";
import { getAutomationSettings, setAutomationSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAutomationSettings());
}

export async function PATCH(request) {
  const { enabled, max_per_source, auto_publish, auto_publish_min_confidence } = await request.json();
  if (max_per_source !== undefined && (max_per_source < 1 || max_per_source > 20)) {
    return NextResponse.json({ error: "max_per_source moet tussen 1 en 20 liggen" }, { status: 400 });
  }
  if (auto_publish_min_confidence !== undefined && (auto_publish_min_confidence < 0 || auto_publish_min_confidence > 1)) {
    return NextResponse.json({ error: "auto_publish_min_confidence moet tussen 0 en 1 liggen" }, { status: 400 });
  }
  setAutomationSettings({ enabled, max_per_source, auto_publish, auto_publish_min_confidence });
  return NextResponse.json(getAutomationSettings());
}
