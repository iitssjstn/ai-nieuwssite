import { NextResponse } from "next/server";
import { getSources, addSource } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getSources());
}

export async function POST(request) {
  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const source = addSource({
    name: body.name,
    feed_url: body.feed_url || "",
    trust_level: body.trust_level || "other",
  });
  return NextResponse.json(source, { status: 201 });
}
