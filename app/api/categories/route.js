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

  const { categories, rename } = await request.json();
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
  // Subcategorieën: maximaal één niveau diep. 'parent' moet verwijzen naar
  // een ANDERE categorie in dezelfde lijst die zelf geen parent heeft —
  // dat voorkomt dat iemand per ongeluk een subcategorie van een
  // subcategorie maakt (bijv. Voetbal onder Sport onder Nieuws), wat de
  // rest van de site (navigatie, categoriepagina's) niet ondersteunt.
  const nameSet = new Set(categories.map((c) => c.name.trim()));
  const topLevelNames = new Set(categories.filter((c) => !c.parent).map((c) => c.name.trim()));
  for (const c of categories) {
    if (!c.parent) continue;
    const parent = c.parent.trim();
    if (parent === c.name.trim()) {
      return NextResponse.json({ error: `"${c.name}" cannot be its own parent category` }, { status: 400 });
    }
    if (!nameSet.has(parent)) {
      return NextResponse.json({ error: `"${c.name}"'s parent category "${parent}" doesn't exist` }, { status: 400 });
    }
    if (!topLevelNames.has(parent)) {
      return NextResponse.json({ error: `"${parent}" is itself a subcategory — only one level of nesting is supported` }, { status: 400 });
    }
  }
  const articlesUpdated = setCategories(
    categories.map((c) => ({ name: c.name.trim(), color: c.color, parent: c.parent ? c.parent.trim() : null })),
    rename
  );
  return NextResponse.json({ categories: getCategories(), articlesUpdated });
}
