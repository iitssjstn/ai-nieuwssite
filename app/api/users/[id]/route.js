import { NextResponse } from "next/server";
import { deleteUser } from "@/lib/db";

export async function DELETE(request, { params }) {
  try {
    const ok = deleteUser(params.id);
    if (!ok) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
