import { NextResponse } from "next/server";
import { getUserById, updateOwnProfile } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const { password_hash, invite_token, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PATCH(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { full_name, email, phone, address } = await request.json();
  if (email !== undefined && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }

  const updated = updateOwnProfile(session.userId, {
    full_name: full_name !== undefined ? (full_name.trim() || null) : undefined,
    email: email !== undefined ? (email.trim() || null) : undefined,
    phone: phone !== undefined ? (phone.trim() || null) : undefined,
    address: address !== undefined ? (address.trim() || null) : undefined,
  });
  if (!updated) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(updated);
}
