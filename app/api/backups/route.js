import { NextResponse } from "next/server";
import { listBackups, createBackupNow, pushBackupToRemote } from "@/lib/backup";
import { getAutomationSettings, getRemoteBackupSettings } from "@/lib/db";

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

    const remoteSettings = getRemoteBackupSettings();
    const remoteResult = await pushBackupToRemote(filename, remoteSettings);

    return NextResponse.json({ filename, backups: listBackups(), remote: remoteResult });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
