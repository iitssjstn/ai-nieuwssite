import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { touchUserLastActive } from "@/lib/db";

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  touchUserLastActive(session.userId);
  return NextResponse.json({ success: true });
}
