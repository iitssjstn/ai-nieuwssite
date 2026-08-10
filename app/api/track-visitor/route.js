import { NextResponse } from "next/server";
import { recordVisitorHeartbeat } from "@/lib/visitor-tracking";

export async function POST(request) {
  try {
    const { visitorId } = await request.json();
    recordVisitorHeartbeat(visitorId);
  } catch {
    // Een kapotte/ontbrekende body mag de pagina van de bezoeker niet breken.
  }
  return NextResponse.json({ ok: true });
}
