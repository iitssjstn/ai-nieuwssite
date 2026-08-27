import { NextResponse } from "next/server";
import { deleteBackup, listBackups } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  try {
    deleteBackup(params.filename);
    return NextResponse.json({ success: true, backups: listBackups() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
