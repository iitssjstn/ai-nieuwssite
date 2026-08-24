import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  // Het token bevat alleen wat er gold ten tijde van inloggen — de
  // gebruikersnaam kan sindsdien gewijzigd zijn. userId blijft wel
  // betrouwbaar (die verandert nooit), dus daarmee de actuele gegevens
  // ophalen i.p.v. te vertrouwen op wat er in het token staat.
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  return NextResponse.json({ username: user.username, role: user.role, full_name: user.full_name });
}
