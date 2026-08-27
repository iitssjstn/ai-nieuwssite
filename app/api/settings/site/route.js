import { NextResponse } from "next/server";
import { getSiteSettings, setSiteSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSiteSettings());
}

export async function PATCH(request) {
  const { site_name, site_description, favicon_url, google_site_verification, bing_site_verification } = await request.json();

  if (site_name !== undefined && !site_name.trim()) {
    return NextResponse.json({ error: "Site name cannot be empty" }, { status: 400 });
  }

  setSiteSettings({
    site_name: site_name !== undefined ? site_name.trim() : undefined,
    site_description: site_description !== undefined ? site_description.trim() : undefined,
    favicon_url,
    // Verification codes are pasted from Search Console / Bing Webmaster
    // Tools as-is — trim only, since some tools include surrounding quotes
    // or whitespace when copy-pasted from their setup instructions.
    google_site_verification: google_site_verification !== undefined ? google_site_verification.trim() || null : undefined,
    bing_site_verification: bing_site_verification !== undefined ? bing_site_verification.trim() || null : undefined,
  });
  return NextResponse.json(getSiteSettings());
}
