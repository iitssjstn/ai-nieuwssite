import { NextResponse } from "next/server";
import { deleteApiKey } from "@/lib/db";

export async function DELETE(request, { params }) {
  deleteApiKey(params.id);
  return NextResponse.json({ success: true });
}
