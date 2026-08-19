import { NextResponse } from "next/server";
import { incrementPageview } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session) incrementPageview();
  return NextResponse.json({ success: true });
}
