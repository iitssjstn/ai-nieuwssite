import { NextResponse } from "next/server";
import { getAdSlots, setAdSlots } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAdSlots());
}

export async function PATCH(request) {
  const body = await request.json();
  setAdSlots(body);
  return NextResponse.json(getAdSlots());
}
