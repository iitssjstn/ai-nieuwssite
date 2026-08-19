import { getAdsenseClientId, getEzoicEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const clientId = getAdsenseClientId();
  const pubId = clientId ? clientId.replace(/^ca-/, "") : null;

  let body = pubId ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n` : "";

  // Ezoic vereist een eigen, door hen beheerde lijst van toegestane
  // advertentiepartners — we voegen die toe aan (niet: vervangen) onze
  // eigen regel(s) hierboven, zodat een probleem bij Ezoic nooit de
  // AdSense-autorisatie kan wegnemen. Dubbele regels zijn onschadelijk
  // volgens de ads.txt-spec, dus ook als je de AdSense-regel later ook
  // los in Ezoic's eigen dashboard invoert, is dat geen probleem.
  if (getEzoicEnabled()) {
    try {
      const host = request.headers.get("host")?.split(":")[0];
      if (host) {
        const res = await fetch(`https://srv.adstxtmanager.com/19390/${host}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const ezoicBody = await res.text();
          body += (body && !body.endsWith("\n") ? "\n" : "") + ezoicBody;
        }
      }
    } catch {
      // Ezoic's dienst niet bereikbaar — de eigen AdSense-regel hierboven
      // blijft hoe dan ook gewoon staan, dus we falen niet hard.
    }
  }

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
