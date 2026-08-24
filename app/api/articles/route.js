import { NextResponse } from "next/server";
import { getArticles, createArticle } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const articles = getArticles({ status });
  return NextResponse.json(articles);
}

export async function POST(request) {
  const body = await request.json();
  if (!body.title || !body.body || !body.source_id) {
    return NextResponse.json(
      { error: "title, body, and source_id are required" },
      { status: 400 }
    );
  }
  const article = createArticle(body);
  return NextResponse.json(article, { status: 201 });
}
