import { NextResponse } from "next/server";
import { getInfoPageContent, setInfoPageContent } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_SLUGS = ["about", "privacy"];

export async function GET(request, { params }) {
  if (!VALID_SLUGS.includes(params.slug)) {
    return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  }
  return NextResponse.json(getInfoPageContent(params.slug));
}

export async function PATCH(request, { params }) {
  if (!VALID_SLUGS.includes(params.slug)) {
    return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  }
  const session = await getSessionFromRequest(request);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { title, body } = await request.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }
  setInfoPageContent(params.slug, { title: title.trim(), body });
  return NextResponse.json(getInfoPageContent(params.slug));
}
