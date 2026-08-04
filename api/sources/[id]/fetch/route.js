import { NextResponse } from "next/server";
import { fetchAndImportFromSource } from "@/lib/rss";

export async function POST(request, { params }) {
  try {
    const result = await fetchAndImportFromSource(params.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
