import { NextResponse } from "next/server";
import { createAdSubmission, getAdSubmissions } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { AD_SLOT_DEFINITIONS } from "@/lib/ad-slots";

// Publiek endpoint — bewust GEEN authenticatie: adverteerders zijn geen
// ingelogde gebruikers van de site. Validatie hieronder is daarom extra
// belangrijk, aangezien dit endpoint vanaf het open internet bereikbaar is.
export async function POST(request) {
  const { slot, image_url, destination_url, advertiser_name, advertiser_email } = await request.json();

  const slotDef = AD_SLOT_DEFINITIONS.find((s) => s.id === slot);
  if (!slotDef) {
    return NextResponse.json({ error: "Unknown ad slot" }, { status: 400 });
  }
  if (!image_url || typeof image_url !== "string" || !image_url.startsWith("/media/")) {
    return NextResponse.json({ error: "No valid uploaded image" }, { status: 400 });
  }
  if (!destination_url || !/^https?:\/\/.+/.test(destination_url)) {
    return NextResponse.json({ error: "Destination URL must start with http:// or https://" }, { status: 400 });
  }
  if (!advertiser_name || !advertiser_name.trim()) {
    return NextResponse.json({ error: "Your name or company name is required" }, { status: 400 });
  }
  if (!advertiser_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(advertiser_email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  const submission = createAdSubmission({
    slot,
    image_url,
    destination_url: destination_url.trim(),
    advertiser_name: advertiser_name.trim(),
    advertiser_email: advertiser_email.trim(),
  });
  return NextResponse.json(submission, { status: 201 });
}

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  return NextResponse.json(getAdSubmissions({ status }));
}
