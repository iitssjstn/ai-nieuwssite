import { NextResponse } from "next/server";
import { votePoll, getPoll } from "@/lib/db";

export async function POST(request, { params }) {
  const { optionId } = await request.json();
  if (!optionId) {
    return NextResponse.json({ error: "optionId is verplicht" }, { status: 400 });
  }

  const cookieName = `voted_${params.id}`;
  const alreadyVoted = request.cookies.get(cookieName)?.value;
  if (alreadyVoted) {
    return NextResponse.json({ error: "Je hebt al gestemd op deze poll" }, { status: 409 });
  }

  const existing = getPoll(params.id);
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (!existing.active) {
    return NextResponse.json({ error: "Deze poll is niet meer actief" }, { status: 400 });
  }

  const poll = votePoll(params.id, optionId);
  if (!poll) return NextResponse.json({ error: "Ongeldige optie" }, { status: 400 });

  const res = NextResponse.json(poll);
  // Cookie i.p.v. een account-vereiste — simpel en drempelloos voor bezoekers,
  // niet waterdicht (kan omzeild worden door cookies te wissen) maar dat is
  // een bewuste, gangbare afweging voor publieke polls zonder inlogvereiste.
  res.cookies.set(cookieName, optionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
