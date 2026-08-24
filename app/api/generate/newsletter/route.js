import { NextResponse } from "next/server";
import { generateNewsletterSummary } from "@/lib/ai";

export async function POST(request) {
  const { title, body } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }
  try {
    const result = await generateNewsletterSummary({ title, body });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
