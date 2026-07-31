import { NextResponse } from "next/server";
import { getArticles } from "@/lib/db";
import { verifyApiKey } from "@/lib/auth-node";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const apiKey = request.headers.get("x-api-key");
  const valid = await verifyApiKey(apiKey);
  if (!valid) {
    return NextResponse.json(
      { error: "Ongeldige of ontbrekende API-key. Geef 'm mee via de header X-API-Key." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));

  const articles = getArticles({ status: "published" })
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      body: a.body,
      category: a.category,
      tags: a.tags,
      featured_image: a.featured_image,
      published_at: a.published_at,
      source_url: a.source_url,
    }));

  return NextResponse.json({ articles });
}
