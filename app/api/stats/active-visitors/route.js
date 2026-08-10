import { NextResponse } from "next/server";
import { getActiveVisitorCount } from "@/lib/visitor-tracking";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  return NextResponse.json({ count: getActiveVisitorCount() });
}
