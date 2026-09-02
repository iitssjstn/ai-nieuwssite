import { NextResponse } from "next/server";
import { recordVisitorHeartbeat } from "@/lib/visitor-tracking";
import { getSessionFromRequest } from "@/lib/auth";
import { isBotUserAgent } from "@/lib/bot-detection";

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    // Zelfde bot-filtering als /api/track — zonder deze check kon een bot
    // die niet is ingelogd wél als "actief op de site" meetellen (On site
    // now), terwijl diezelfde bot terecht werd uitgesloten van de
    // paginaweergaves. Dat gaf het verwarrende beeld van "iemand online,
    // maar geen enkele view" — nu gebruiken beide tellingen precies
    // dezelfde maatstaf voor "een echte, menselijke bezoeker".
    if (!session && !isBotUserAgent(request.headers.get("user-agent"))) {
      const { visitorId } = await request.json();
      recordVisitorHeartbeat(visitorId);
    }
  } catch {
    // Een kapotte/ontbrekende body mag de pagina van de bezoeker niet breken.
  }
  return NextResponse.json({ ok: true });
}
