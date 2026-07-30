import { NextResponse } from "next/server";
import { getUsers } from "@/lib/db";
import { createEditorAccount } from "@/lib/auth-node";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ users: getUsers() });
}

export async function POST(request) {
  const { username, password, role } = await request.json();
  try {
    const user = createEditorAccount(username, password, role === "admin" ? "admin" : "editor");
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
