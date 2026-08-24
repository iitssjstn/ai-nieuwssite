import { NextResponse } from "next/server";
import { getInfoPagesSettings, setInfoPagesSettings } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getInfoPagesSettings());
}

export async function PATCH(request) {
  const session = await getSessionFromRequest(request);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await request.json();
  setInfoPagesSettings(body);
  return NextResponse.json(getInfoPagesSettings());
}
