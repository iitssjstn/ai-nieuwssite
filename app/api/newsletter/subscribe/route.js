import { NextResponse } from "next/server";
import { getNewsletterSettings, addNewsletterSubscriber } from "@/lib/db";

export async function POST(request) {
  const { enabled } = getNewsletterSettings();
  if (!enabled) {
    return NextResponse.json({ error: "Nieuwsbrief is momenteel niet beschikbaar" }, { status: 400 });
  }

  const { email } = await request.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geef een geldig e-mailadres op" }, { status: 400 });
  }

  addNewsletterSubscriber(email.trim().toLowerCase());
  return NextResponse.json({ success: true });
}
