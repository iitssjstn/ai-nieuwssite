import { NextResponse } from "next/server";
import { incrementPageview } from "@/lib/db";

export async function POST() {
  incrementPageview();
  return NextResponse.json({ success: true });
}
