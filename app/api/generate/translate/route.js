import { NextResponse } from "next/server";
import { translateArticle } from "@/lib/ai";

export async function POST(request) {
  const { title, body, language } = await request.json();
  if (!title || !body || !language) {
    return NextResponse.json({ error: "title, body en language zijn verplicht" }, { status: 400 });
  }
  try {
    const result = await translateArticle({ title, body, language });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
