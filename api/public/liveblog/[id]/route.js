import { NextResponse } from "next/server";
import { getArticle } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const article = getArticle(params.id);
  // Alleen updates van gepubliceerde liveblogs zijn publiek op te vragen —
  // nooit concepten of andere statussen, ongeacht wat er wordt opgevraagd.
  if (!article || article.status !== "published" || !article.is_liveblog) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ updates: article.liveblog_updates || [] });
}
