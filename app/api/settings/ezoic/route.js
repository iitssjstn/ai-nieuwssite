import { NextResponse } from "next/server";
import { getEzoicEnabled, setEzoicEnabled } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ enabled: getEzoicEnabled() });
}

export async function PATCH(request) {
  const { enabled } = await request.json();
  setEzoicEnabled(enabled);
  return NextResponse.json({ enabled: getEzoicEnabled() });
}
