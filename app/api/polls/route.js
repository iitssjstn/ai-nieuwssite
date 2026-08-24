import { NextResponse } from "next/server";
import { getPolls, createPoll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ polls: getPolls() });
}

export async function POST(request) {
  const { question, options, article_id } = await request.json();
  if (!question || !Array.isArray(options) || options.filter((o) => o?.trim()).length < 2) {
    return NextResponse.json({ error: "A question and at least 2 options are required" }, { status: 400 });
  }
  const poll = createPoll({ question, options: options.filter((o) => o?.trim()), article_id });
  return NextResponse.json(poll, { status: 201 });
}
