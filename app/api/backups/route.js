import { NextResponse } from "next/server";
import { listBackups, createBackupNow } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ backups: listBackups() });
}

export async function POST() {
  try {
    const filename = createBackupNow();
    return NextResponse.json({ filename, backups: listBackups() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
