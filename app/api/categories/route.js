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
    return NextResponse.json({ error: "Alleen voor admins" }, { status: 403 });
  }

  const { categories } = await request.json();
  if (!Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json({ error: "Minstens één categorie is verplicht" }, { status: 400 });
  }
  for (const c of categories) {
    if (!c.name || !c.name.trim()) {
      return NextResponse.json({ error: "Elke categorie heeft een naam nodig" }, { status: 400 });
    }
    if (!c.color || !/^#[0-9a-fA-F]{6}$/.test(c.color)) {
      return NextResponse.json({ error: `Ongeldige kleur voor "${c.name}"` }, { status: 400 });
    }
  }
  const names = categories.map((c) => c.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    return NextResponse.json({ error: "Categorienamen moeten uniek zijn" }, { status: 400 });
  }
  setCategories(categories.map((c) => ({ name: c.name.trim(), color: c.color })));
  return NextResponse.json({ categories: getCategories() });
}
