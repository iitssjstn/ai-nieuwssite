import { NextResponse } from "next/server";
import { generateDraft } from "@/lib/ai";
import { createArticle, getSources } from "@/lib/db";

export async function POST(request) {
  const body = await request.json();
  const { source_id, source_text } = body;

  if (!source_id || !source_text) {
    return NextResponse.json(
      { error: "source_id en source_text zijn verplicht" },
      { status: 400 }
    );
  }

  const source = getSources().find((s) => s.id === source_id);
  if (!source) {
    return NextResponse.json({ error: "Onbekende bron" }, { status: 400 });
  }

  try {
    const draft = await generateDraft({
      sourceText: source_text,
      sourceName: source.name,
    });

  const article = createArticle({
      source_id,
      source_raw_text: source_text,
      title: draft.title,
      body: draft.body,
      category: draft.category,
      flags: draft.flags,
      confidence_score: draft.confidence_score,
      generated_by: draft.provider,
    });

    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
