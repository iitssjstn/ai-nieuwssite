import { NextResponse } from "next/server";
import { getCategories, setCategories } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ categories: getCategories() });
}

export async function PUT(request) {
  const session = await getSessionFromRequest(request);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { categories } = await request.json();
  if (!Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
  }
  for (const c of categories) {
    if (!c.name || !c.name.trim()) {
      return NextResponse.json({ error: "Every category needs a name" }, { status: 400 });
    }
    if (!c.color || !/^#[0-9a-fA-F]{6}$/.test(c.color)) {
      return NextResponse.json({ error: `Invalid color for "${c.name}"` }, { status: 400 });
    }
  }
  const names = categories.map((c) => c.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    return NextResponse.json({ error: "Category names must be unique" }, { status: 400 });
  }
  setCategories(categories.map((c) => ({ name: c.name.trim(), color: c.color })));
  return NextResponse.json({ categories: getCategories() });
}
