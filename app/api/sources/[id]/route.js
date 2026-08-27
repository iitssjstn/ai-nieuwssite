import { NextResponse } from "next/server";
import { deleteSource, updateSource } from "@/lib/db";

export async function DELETE(request, { params }) {
  const ok = deleteSource(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PATCH(request, { params }) {
  const { poll_interval_minutes } = await request.json();

  if (poll_interval_minutes !== undefined && poll_interval_minutes !== null) {
    const n = Number(poll_interval_minutes);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "Interval must be a number of at least 1 minute" }, { status: 400 });
    }
  }

  const updated = updateSource(params.id, {
    // null/leeg = expliciet terug naar het globale standaardinterval.
    poll_interval_minutes: poll_interval_minutes === undefined || poll_interval_minutes === null || poll_interval_minutes === ""
      ? null
      : Number(poll_interval_minutes),
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
