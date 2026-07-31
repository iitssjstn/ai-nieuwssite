import { NextResponse } from "next/server";
import { getImageProviderConfig } from "@/lib/db";
import { confirmUnsplashDownload } from "@/lib/image-search";

export async function POST(request) {
  const { confirmUrl, source } = await request.json();
  if (source === "Unsplash" && confirmUrl) {
    const cfg = getImageProviderConfig("unsplash");
    confirmUnsplashDownload(confirmUrl, cfg?.api_key);
  }
  return NextResponse.json({ success: true });
}
