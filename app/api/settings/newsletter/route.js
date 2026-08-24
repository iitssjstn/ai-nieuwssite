import { NextResponse } from "next/server";
import { getNewsletterSettings, setNewsletterSettings, getNewsletterSubscribers } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  const settings = getNewsletterSettings();
  // Alleen bij een ingelogde sessie het aantal abonnees meesturen — dat is
  // interne informatie, geen publieke data.
  if (session) {
    return NextResponse.json({ ...settings, subscriber_count: getNewsletterSubscribers().length });
  }
  return NextResponse.json(settings);
}

export async function PATCH(request) {
  const session = await getSessionFromRequest(request);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { sender_email } = await request.json();
  if (sender_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender_email)) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }
  setNewsletterSettings({ sender_email });
  return NextResponse.json({ ...getNewsletterSettings(), subscriber_count: getNewsletterSubscribers().length });
}
