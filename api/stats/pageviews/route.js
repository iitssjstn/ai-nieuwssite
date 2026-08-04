import { NextResponse } from "next/server";
import { getPageviewStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ days: getPageviewStats(14) });
}
