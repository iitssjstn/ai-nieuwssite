import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Bewust een APART pad van /api/uploads: die staat in middleware.js'
// ADMIN_PATH_PREFIXES en vereist dus een ingelogde sessie — een anonieme
// adverteerder op /advertise heeft die niet. /api/ad-uploads staat NIET in
// die lijst, dus valt buiten de admin-gating, zonder dat de bestaande
// (gevoelige) beveiligingscode in middleware.js aangepast hoeft te worden.
// Zelfde validatie als /api/uploads, en slaat op in dezelfde map, zodat de
// resulterende /media/<bestand>-URL door de al bestaande publieke
// /media/[filename]-route bediend kan worden.
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
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WEBP, or GIF allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is larger than 5MB" }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}.${ext}`;

  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not save file on the server: " + err.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: `/media/${filename}` }, { status: 201 });
}
