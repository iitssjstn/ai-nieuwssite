import { NextResponse } from "next/server";
import { getUserByInviteToken } from "@/lib/db";
import { acceptInvite } from "@/lib/auth-node";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const user = getUserByInviteToken(params.token);
  if (!user) {
    return NextResponse.json({ error: "Deze uitnodigingslink is ongeldig of verlopen." }, { status: 404 });
  }
  return NextResponse.json({ username: user.username, full_name: user.full_name, email: user.email });
}

export async function POST(request, { params }) {
  const { password } = await request.json();
  try {
    acceptInvite(params.token, password);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
