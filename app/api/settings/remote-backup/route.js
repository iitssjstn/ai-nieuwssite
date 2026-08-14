import { NextResponse } from "next/server";
import { getRemoteBackupSettings, setRemoteBackupSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getRemoteBackupSettings());
}

export async function PATCH(request) {
  const { url, key } = await request.json();
  if (url !== undefined && url.trim() && !/^https?:\/\//.test(url.trim())) {
    return NextResponse.json({ error: "URL moet beginnen met http:// of https://" }, { status: 400 });
  }
  setRemoteBackupSettings({
    url: url !== undefined ? (url.trim() || null) : undefined,
    key: key !== undefined ? (key.trim() || null) : undefined,
  });
  return NextResponse.json(getRemoteBackupSettings());
}
