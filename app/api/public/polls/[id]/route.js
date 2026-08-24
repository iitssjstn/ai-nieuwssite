import { NextResponse } from "next/server";
import { getPoll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const poll = getPoll(params.id);
  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const votedOptionId = request.cookies.get(`voted_${params.id}`)?.value || null;
  return NextResponse.json({ ...poll, votedOptionId });
}
