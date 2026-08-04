import { NextResponse } from "next/server";
import { getPoll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const poll = getPoll(params.id);
  if (!poll) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(poll);
}
