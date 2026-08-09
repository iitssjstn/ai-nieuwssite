import { NextResponse } from "next/server";
import { regenerateInvite } from "@/lib/auth-node";

export async function POST(request, { params }) {
  try {
    const inviteToken = regenerateInvite(params.id);
    return NextResponse.json({ inviteToken });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
