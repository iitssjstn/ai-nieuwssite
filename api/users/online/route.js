import { NextResponse } from "next/server";
import { getOnlineUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Bewust alleen naam/rol — geen e-mail/telefoon/adres van collega's delen
  // via dit "wie is online"-overzicht, dat voor elke ingelogde gebruiker
  // zichtbaar is (niet alleen admins).
  const users = getOnlineUsers(2).map(({ id, username, full_name, role }) => ({ id, username, full_name, role }));
  return NextResponse.json({ users });
}
