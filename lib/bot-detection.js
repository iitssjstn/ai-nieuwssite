import { NextResponse } from "next/server";
import { incrementPageview } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { isBotUserAgent } from "@/lib/bot-detection";

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  // Bots voeren zelden client-side JS uit (deze route wordt vanuit de
  // browser aangeroepen, zie PageviewTracker.js), dus dit vangt vooral de
  // uitzonderingen — headless crawlers, sommige preview-bots — die dat
  // wel doen. Zelfde reden als bij incrementViews.
  if (!session && !isBotUserAgent(request.headers.get("user-agent"))) {
    incrementPageview();
  }
  return NextResponse.json({ success: true });
}
