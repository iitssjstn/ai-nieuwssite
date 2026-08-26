import { NextResponse } from "next/server";
import { restoreFromBackup, restoreFromUploadedContent, listBackups } from "@/lib/backup";

export const dynamic = "force-dynamic";

// Restores from a local backup (by filename) OR from an uploaded file's
// raw content — exactly one of the two must be present in the body.
export async function POST(request) {
  try {
    const body = await request.json();
    let result;
    if (body.filename) {
      result = restoreFromBackup(body.filename);
    } else if (typeof body.content === "string") {
      result = restoreFromUploadedContent(body.content);
    } else {
      return NextResponse.json({ error: "Provide either 'filename' or 'content'" }, { status: 400 });
    }
    return NextResponse.json({ success: true, safetyBackupFilename: result.safetyBackupFilename, backups: listBackups() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
