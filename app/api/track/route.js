import { NextResponse } from "next/server";
import { incrementPageview, incrementCountry } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { isBotUserAgent } from "@/lib/bot-detection";
import geoip from "geoip-lite";

// Achter de reverse proxy (Nginx Proxy Manager) staat het echte IP-adres
// van de bezoeker in x-forwarded-for, niet in het verbindings-IP zelf (dat
// is altijd de proxy). Bij meerdere doorgeschakelde proxies bevat dat
// header een komma-gescheiden lijst — het EERSTE adres is het origineel.
function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return null;
}

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  // Bots voeren zelden client-side JS uit (deze route wordt vanuit de
  // browser aangeroepen, zie PageviewTracker.js), dus dit vangt vooral de
  // uitzonderingen — headless crawlers, sommige preview-bots — die dat
  // wel doen. Zelfde reden als bij incrementViews.
  if (!session && !isBotUserAgent(request.headers.get("user-agent"))) {
    incrementPageview();

    // Alleen-lokaal, offline landcode-opzoeking (geoip-lite bevat zijn
    // eigen database, geen enkele aanroep naar een externe dienst) — er
    // wordt uitsluitend een landcode geteld, het IP-adres zelf wordt
    // nergens opgeslagen, ook niet tijdelijk.
    try {
      const ip = getClientIp(request);
      const geo = ip ? geoip.lookup(ip) : null;
      if (geo?.country) incrementCountry(geo.country);
    } catch {
      // Een mislukte land-opzoeking mag de paginaweergave-telling zelf nooit blokkeren.
    }
  }
  return NextResponse.json({ success: true });
}
