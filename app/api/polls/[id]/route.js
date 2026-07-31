import { NextResponse } from "next/server";
import { deletePoll, togglePollActive } from "@/lib/db";

export async function DELETE(request, { params }) {
  deletePoll(params.id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request, { params }) {
  const poll = togglePollActive(params.id);
  if (!poll) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(poll);
}
