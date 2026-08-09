import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { changeOwnPassword } from "@/lib/auth-node";

export async function PATCH(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  try {
    await changeOwnPassword(session.userId, currentPassword, newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
