import { NextResponse } from "next/server";
import { deleteUser, updateUser } from "@/lib/db";
import { setUserPassword } from "@/lib/auth-node";

export async function DELETE(request, { params }) {
  try {
    const ok = deleteUser(params.id);
    if (!ok) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(request, { params }) {
  const { username, full_name, email, phone, address, role, newPassword } = await request.json();

  if (email !== undefined && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }

  try {
    if (newPassword) {
      setUserPassword(params.id, newPassword);
    }
    const updated = updateUser(params.id, {
      username: username !== undefined ? username.trim() : undefined,
      full_name: full_name !== undefined ? (full_name.trim() || null) : undefined,
      email: email !== undefined ? (email.trim() || null) : undefined,
      phone: phone !== undefined ? (phone.trim() || null) : undefined,
      address: address !== undefined ? (address.trim() || null) : undefined,
      role,
    });
    if (!updated) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
