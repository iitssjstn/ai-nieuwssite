import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Alleen JPEG, PNG, WEBP of GIF toegestaan" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Bestand is groter dan 5MB" }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}.${ext}`;

  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  } catch (err) {
    // Meestal een bestandsrechten-probleem op de server (bijv. de gemounte
    // data-map is niet schrijfbaar voor de containergebruiker) — dit geeft
    // nu een duidelijke melding i.p.v. een stille crash.
    return NextResponse.json(
      { error: "Kon bestand niet opslaan op de server: " + err.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: `/media/${filename}` }, { status: 201 });
}
