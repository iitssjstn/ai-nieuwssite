import { NextResponse } from "next/server";
import { generateTitleVariants } from "@/lib/ai";

export async function POST(request) {
  const { title, body } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title en body zijn verplicht" }, { status: 400 });
  }
  try {
    const titles = await generateTitleVariants({ title, body });
    return NextResponse.json({ titles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
