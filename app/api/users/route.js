import { NextResponse } from "next/server";
import { getUsers } from "@/lib/db";
import { createEditorAccount } from "@/lib/auth-node";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ users: getUsers() });
}

export async function POST(request) {
  const { username, password, role, full_name, email, phone, address } = await request.json();

  if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }

  try {
    const user = createEditorAccount(username, password, role === "admin" ? "admin" : "editor", {
      full_name: full_name?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
