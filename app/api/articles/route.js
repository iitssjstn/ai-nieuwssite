import { NextResponse } from "next/server";
import { getArticles, createArticle } from "@/lib/db";

// Deze velden worden hier NOOIT gebruikt door de admin-lijstschermen
// (Queue, Published, dashboard) die dit endpoint aanroepen — geverifieerd
// door alle drie de aanroepers na te lopen. Het meesturen van de volledige
// artikeltekst (en AI-debuginformatie) voor elk artikel in de lijst was de
// oorzaak van een merkbaar trage/vastlopende pagina zodra er veel
// artikelen zijn: bij honderden artikelen betekent dat een veelvoud aan
// onnodige data over de lijn én een zware React-render. Puur een lichtere
// HTTP-respons — de losse getArticle(id)-aanroep voor het bewerkscherm van
// één artikel blijft wél alles bevatten.
const LIST_ONLY_HEAVY_FIELDS = ["body", "claims", "consistency_notes", "ai_verification_notes", "ai_provider_notes", "image_keywords"];

function stripHeavyFields(article) {
  const light = { ...article };
  for (const field of LIST_ONLY_HEAVY_FIELDS) delete light[field];
  return light;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const articles = getArticles({ status });
  return NextResponse.json(articles.map(stripHeavyFields));
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
