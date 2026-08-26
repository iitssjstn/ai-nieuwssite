import { NextResponse } from "next/server";
import { getAdMavenPlacementId, setAdMavenPlacementId } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ placementId: getAdMavenPlacementId() });
}

export async function PATCH(request) {
  const { placementId } = await request.json();
  setAdMavenPlacementId(placementId?.trim() || null);
  return NextResponse.json({ placementId: getAdMavenPlacementId() });
}
