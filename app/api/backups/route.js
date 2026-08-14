import { NextResponse } from "next/server";
import { listBackups, createBackupNow } from "@/lib/backup";
import { getAutomationSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ backups: listBackups() });
  } catch (err) {
    return NextResponse.json({ error: err.message, backups: [] }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { backup_frequency_hours } = getAutomationSettings();
    const filename = createBackupNow(backup_frequency_hours);
    return NextResponse.json({ filename, backups: listBackups() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
