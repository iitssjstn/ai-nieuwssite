import { getIndexNowKey } from "@/lib/db";
import { NextResponse } from "next/server";

// IndexNow verifieert een ping door <sleutel>.txt op te vragen op de root
// van de site en te checken of de inhoud exact de sleutel is. Deze route
// vangt willekeurige root-paden op (bijv. /a1b2c3....txt), maar Next.js
// geeft statische routes (zoals /ads.txt, /login, /artikel/...) altijd
// voorrang boven deze dynamische — dus die blijven ongemoeid.
export async function GET(request, { params }) {
  const key = getIndexNowKey();
  if (params.indexnowKeyFile !== `${key}.txt`) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
