import { NextResponse } from "next/server";
import { getImageProviderConfig } from "@/lib/db";
import { searchStockPhoto, searchStockPhotoOptions } from "@/lib/image-search";

export async function POST(request) {
  const { query, multiple } = await request.json();
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Geef een zoekopdracht op" }, { status: 400 });
  }
  const providerConfigs = {
    pexels: getImageProviderConfig("pexels"),
    unsplash: getImageProviderConfig("unsplash"),
  };

  try {
    if (multiple) {
      const options = await searchStockPhotoOptions(query.trim(), providerConfigs);
      if (options.length === 0) {
        return NextResponse.json(
          { error: "Geen resultaat gevonden — check of er een provider is ingesteld, of probeer een andere zoekopdracht." },
          { status: 404 }
        );
      }
      // _downloadLocation blijft intern nodig (voor de confirm-stap hierna),
      // maar de API-key zelf gaat nooit mee naar de browser.
      return NextResponse.json({
        options: options.map(({ url, thumb, credit_name, credit_url, source, _downloadLocation }) => ({
          url, thumb: thumb || url, credit_name, credit_url, source, confirmUrl: _downloadLocation || null,
        })),
      });
    }

    const photo = await searchStockPhoto(query.trim(), providerConfigs);
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
