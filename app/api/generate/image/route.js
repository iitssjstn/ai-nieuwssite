import { NextResponse } from "next/server";
import { getImageProviderConfig } from "@/lib/db";
import { searchStockPhoto } from "@/lib/image-search";

export async function POST(request) {
  const { query } = await request.json();
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Geef een zoekopdracht op" }, { status: 400 });
  }
  try {
    const photo = await searchStockPhoto(query.trim(), {
      pexels: getImageProviderConfig("pexels"),
      unsplash: getImageProviderConfig("unsplash"),
    });
    if (!photo) {
      return NextResponse.json(
        { error: "Geen resultaat gevonden — check of er een provider is ingesteld, of probeer een andere zoekopdracht." },
        { status: 404 }
      );
    }
    return NextResponse.json(photo);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
