import { NextResponse } from "next/server";
import { recordVisitorHeartbeat } from "@/lib/visitor-tracking";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      const { visitorId } = await request.json();
      recordVisitorHeartbeat(visitorId);
    }
  } catch {
    // Een kapotte/ontbrekende body mag de pagina van de bezoeker niet breken.
  }
  return NextResponse.json({ ok: true });
}
