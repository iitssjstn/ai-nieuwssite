import { NextResponse } from "next/server";
import { deleteSource } from "@/lib/db";

export async function DELETE(request, { params }) {
  const ok = deleteSource(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
