import { NextResponse } from "next/server";
import { getRemoteBackupSettings, setRemoteBackupSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

function safeResponse() {
  const { url, key } = getRemoteBackupSettings();
  // De daadwerkelijke sleutel wordt nooit teruggestuurd naar de browser —
  // alleen of er wel of niet één is ingesteld. Zo staat 'm nergens in de
  // pagina-broncode of via "Inspecteren" te zien, ook niet als iemand met
  // toegang tot het adminpaneel daar zou kijken.
  return { url, hasKey: Boolean(key) };
}

export async function GET() {
  return NextResponse.json(safeResponse());
}

export async function PATCH(request) {
  const { url, key } = await request.json();
  if (url !== undefined && url.trim() && !/^https?:\/\//.test(url.trim())) {
    return NextResponse.json({ error: "URL moet beginnen met http:// of https://" }, { status: 400 });
  }
  setRemoteBackupSettings({
    url: url !== undefined ? (url.trim() || null) : undefined,
    // Een lege sleutel betekent hier "niet gewijzigd" (het veld liet men
    // leeg om de bestaande waarde te behouden), niet "wissen" — daarvoor
    // is bewust geen aparte knop, om te voorkomen dat je per ongeluk de
    // koppeling verbreekt door alleen de URL te willen aanpassen.
    key: key !== undefined && key.trim() ? key.trim() : undefined,
  });
  return NextResponse.json(safeResponse());
}
