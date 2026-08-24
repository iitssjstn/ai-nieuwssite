import { NextResponse } from "next/server";
import { readBackupFile } from "@/lib/backup";

export async function GET(request, { params }) {
  const content = readBackupFile(params.filename);
  if (!content) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }
  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${params.filename}"`,
    },
  });
}
