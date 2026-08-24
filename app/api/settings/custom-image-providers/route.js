import { NextResponse } from "next/server";
import { getCustomImageProviders, setCustomImageProviders } from "@/lib/db";
import { IMAGE_PROVIDERS } from "@/lib/image-search";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ providers: getCustomImageProviders() });
}

export async function POST(request) {
  const body = await request.json();
  const { label, url_template, auth_type, auth_header_name, auth_header_prefix, auth_query_param, results_path, image_field, thumb_field, credit_name_field, credit_url_field } = body;

  if (!label || !label.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!url_template || !url_template.includes("{q}")) {
    return NextResponse.json({ error: "The URL must contain the {q} placeholder for the search term" }, { status: 400 });
  }
  if (auth_type === "header" && !auth_header_name?.trim()) {
    return NextResponse.json({ error: "Provide a header name (e.g. Authorization)" }, { status: 400 });
  }
  if (auth_type === "query" && !auth_query_param?.trim()) {
    return NextResponse.json({ error: "Provide a query parameter name (e.g. key)" }, { status: 400 });
  }
  if (!results_path?.trim()) {
    return NextResponse.json({ error: "Indicate where the results list is in the response (e.g. \"photos\" or \"data.items\")" }, { status: 400 });
  }
  if (!image_field?.trim()) {
    return NextResponse.json({ error: "Indicate which field contains the image URL" }, { status: 400 });
  }

  const existing = getCustomImageProviders();
  const allIds = [...IMAGE_PROVIDERS.map((p) => p.id), ...existing.map((p) => p.id)];
  let id = `custom-${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (allIds.includes(id)) id = `custom-${crypto.randomUUID().slice(0, 8)}`;

  const provider = {
    id,
    label: label.trim(),
    url_template: url_template.trim(),
    auth_type: auth_type === "header" ? "header" : "query",
    auth_header_name: auth_header_name?.trim() || null,
    auth_header_prefix: auth_header_prefix || "",
    auth_query_param: auth_query_param?.trim() || null,
    results_path: results_path.trim(),
    image_field: image_field.trim(),
    thumb_field: thumb_field?.trim() || null,
    credit_name_field: credit_name_field?.trim() || null,
    credit_url_field: credit_url_field?.trim() || null,
  };

  setCustomImageProviders([...existing, provider]);
  return NextResponse.json(provider, { status: 201 });
}
