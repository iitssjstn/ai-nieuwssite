import { NextResponse } from "next/server";
import { getWebhooks, createWebhook } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ webhooks: getWebhooks() });
}

export async function POST(request) {
  const { url, events } = await request.json();
  if (!url || !url.trim()) {
    return NextResponse.json({ error: "URL is verplicht" }, { status: 400 });
  }
  const webhook = createWebhook({ url: url.trim(), events });
  return NextResponse.json(webhook, { status: 201 });
}
