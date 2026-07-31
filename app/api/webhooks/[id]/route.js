import { NextResponse } from "next/server";
import { deleteWebhook, toggleWebhookActive } from "@/lib/db";

export async function DELETE(request, { params }) {
  deleteWebhook(params.id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request, { params }) {
  const webhook = toggleWebhookActive(params.id);
  if (!webhook) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(webhook);
}
