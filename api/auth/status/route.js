import { NextResponse } from "next/server";
import { hasAdminAccount } from "@/lib/auth-node";

export const dynamic = "force-dynamic";

export async function GET() {
  // Geeft alleen een boolean terug — nooit de hash zelf. Veilig om zonder
  // login te bevragen, want de loginpagina moet dit kunnen checken vóórdat
  // iemand is ingelogd (er is namelijk nog geen account).
  return NextResponse.json({ hasAccount: hasAdminAccount() });
}
