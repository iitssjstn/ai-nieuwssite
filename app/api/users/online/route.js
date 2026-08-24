import { NextResponse } from "next/server";
import { getOnlineUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Deliberately only name/role — don't share colleagues' email/phone/address
  // via this "who's online" overview, which is visible to every logged-in
  // user (not just admins).
  const users = getOnlineUsers(2).map(({ id, username, full_name, role }) => ({ id, username, full_name, role }));
  return NextResponse.json({ users });
}
