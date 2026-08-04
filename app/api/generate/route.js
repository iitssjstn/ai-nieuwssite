import { NextResponse } from "next/server";
import { generateDraft } from "@/lib/ai";
import { createArticle, getSources, findPossibleDuplicate, getAllImageProviderConfigs, getCustomImageProviders, getCategories } from "@/lib/db";
import { searchStockPhoto } from "@/lib/image-search";
import { geocodeLocation } from "@/lib/geocode";

export async function POST(request) {
  const body = await request.json();
  const { source_id, source_text, source_url, additional_sources, category_override } = body;

  if (!source_id || !source_text) {
    return NextResponse.json(
      { error: "source_id en source_text zijn verplicht" },
      { status: 400 }
    );
  }

  if (category_override && !getCategories().some((c) => c.name === category_override)) {
    return NextResponse.json({ error: "Onbekende categorie" }, { status: 400 });
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

    // Automatisch een passende stockfoto zoeken op basis van de door de AI
    // bedachte trefwoorden. Faalt dit (geen provider ingesteld, geen
    // resultaat, storing) dan wordt het artikel gewoon zonder afbeelding
    // aangemaakt — dit mag het genereren nooit blokkeren.
    let featuredImage = null;
    let featuredImageCredit = null;
    if (draft.image_keywords) {
      try {
        const photo = await searchStockPhoto(draft.image_keywords, getAllImageProviderConfigs(), getCustomImageProviders());
        if (photo) {
          featuredImage = photo.url;
          featuredImageCredit = { name: photo.credit_name, url: photo.credit_url, source: photo.source };
        }
      } catch {
        // stil negeren — geen afbeelding is niet erg genoeg om het hele
        // concept te laten mislukken
      }
    }

    // Automatisch een locatie koppelen (voor de nieuwskaart) als de AI een
    // duidelijke plaats in het artikel herkende. Faalt de geocoding, dan
    // blijft het artikel gewoon zonder locatie — nooit blokkerend, net als
    // bij de stockfoto.
    const location = draft.location_hint ? await geocodeLocation(draft.location_hint) : null;

    const article = createArticle({
      source_id,
      source_raw_text: source_text,
      source_url: source_url?.trim() || null,
      additional_sources: additionalSources.map(({ name, url }) => ({ name, url })),
      title: draft.title,
      body: draft.body,
      category: category_override || draft.category,
      flags: draft.flags,
      confidence_score: draft.confidence_score,
      generated_by: draft.provider,
      possible_duplicate: possibleDuplicate,
      consistency_notes: draft.consistency_notes || [],
      featured_image: featuredImage,
      featured_image_credit: featuredImageCredit,
      claims: draft.claims || [],
      location,
    });

    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
