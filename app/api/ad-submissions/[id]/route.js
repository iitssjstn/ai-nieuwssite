import { NextResponse } from "next/server";
import { updateAdSubmission, deleteAdSubmission } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// Goed-/afkeuren van betaalde advertenties is bewust admin-only (niet
// voor editors) — dit raakt direct de inkomsten en reputatie van de site,
// anders dan het redigeren van een artikel.
export async function PATCH(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { status } = await request.json();
  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const updated = updateAdSubmission(params.id, { status });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const ok = deleteAdSubmission(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
