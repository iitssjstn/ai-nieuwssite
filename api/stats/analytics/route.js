import { NextResponse } from "next/server";
import { getTopArticles, getCategoryStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "today";
  const days = period === "week" ? 7 : period === "month" ? 30 : 1;

  return NextResponse.json({
    top_articles: getTopArticles(days),
    by_category: getCategoryStats(),
  });
}
