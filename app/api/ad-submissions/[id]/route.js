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

  const { status, start_date, end_date } = await request.json();
  if (status !== undefined && !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (status === "approved" && !start_date) {
    return NextResponse.json({ error: "A start date is required to approve and schedule an ad" }, { status: 400 });
  }
  if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
    return NextResponse.json({ error: "End date can't be before the start date" }, { status: 400 });
  }

  try {
    const updated = updateAdSubmission(params.id, {
      ...(status !== undefined ? { status } : {}),
      ...(start_date !== undefined ? { start_date } : {}),
      ...(end_date !== undefined ? { end_date } : {}),
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    // Overlap-conflicten (zie updateAdSubmission) horen bij een 409
    // Conflict, niet bij een generieke 500 — dit is een verwachte,
    // voorkombare situatie voor de gebruiker, geen serverfout.
    const statusCode = err.isConflict ? 409 : 500;
    return NextResponse.json({ error: err.message }, { status: statusCode });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const ok = deleteAdSubmission(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
