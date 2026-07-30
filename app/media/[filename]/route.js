import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const SAFE_FILENAME = /^[a-f0-9-]+\.(jpg|jpeg|png|webp|gif)$/i;

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(request, { params }) {
  const { filename } = params;

  // Alleen exact dit patroon toestaan — voorkomt path traversal (../../etc)
  // en zorgt dat er nooit iets buiten de uploads-map gelezen kan worden.
  if (!SAFE_FILENAME.test(filename)) {
    return NextResponse.json({ error: "Ongeldige bestandsnaam" }, { status: 400 });
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Ongeldig pad" }, { status: 400 });
  }

  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
  } catch {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const ext = filename.split(".").pop().toLowerCase();
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
