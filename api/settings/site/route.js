import { NextResponse } from "next/server";
import { getSiteSettings, setSiteSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSiteSettings());
}

export async function PATCH(request) {
  const { site_name, site_description, favicon_url } = await request.json();

  if (site_name !== undefined && !site_name.trim()) {
    return NextResponse.json({ error: "Sitenaam mag niet leeg zijn" }, { status: 400 });
  }

  setSiteSettings({
    site_name: site_name !== undefined ? site_name.trim() : undefined,
    site_description: site_description !== undefined ? site_description.trim() : undefined,
    favicon_url,
  });
  return NextResponse.json(getSiteSettings());
}
