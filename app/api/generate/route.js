import { NextResponse } from "next/server";
import { generateDraft } from "@/lib/ai";
import { createArticle, getSources, findPossibleDuplicate } from "@/lib/db";

export async function POST(request) {
  const body = await request.json();
  const { source_id, source_text, source_url, additional_sources } = body;

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

  const additionalSources = Array.isArray(additional_sources)
    ? additional_sources.filter((s) => s?.text?.trim()).map((s) => ({ name: s.name, text: s.text, url: s.url || null }))
    : [];

  try {
    const draft = await generateDraft({
      sourceText: source_text,
      sourceName: source.name,
      additionalSources,
    });

    const possibleDuplicate = findPossibleDuplicate(draft.title);

    const article = createArticle({
      source_id,
      source_raw_text: source_text,
      source_url: source_url?.trim() || null,
      additional_sources: additionalSources.map(({ name, url }) => ({ name, url })),
      title: draft.title,
      body: draft.body,
      category: draft.category,
      flags: draft.flags,
      confidence_score: draft.confidence_score,
      generated_by: draft.provider,
      possible_duplicate: possibleDuplicate,
      consistency_notes: draft.consistency_notes || [],
    });

    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
