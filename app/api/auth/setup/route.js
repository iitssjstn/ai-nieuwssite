import { NextResponse } from "next/server";
import { computeSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hasAdminAccount, createAdminAccount } from "@/lib/auth-node";
import { setGoogleApiKey } from "@/lib/db";

export async function POST(request) {
  // Server-side afgedwongen: dit endpoint werkt maar ÉÉN keer, ongeacht wat
  // de UI toont. Dit voorkomt dat iemand die na de eerste keer langskomt
  // alsnog een (tweede) account kan aanmaken of het wachtwoord kan
  // overschrijven via dit endpoint.
  if (hasAdminAccount()) {
    return NextResponse.json(
      { error: "Er bestaat al een admin-account. Gebruik /login." },
      { status: 409 }
    );
  }

  const { password, googleApiKey } = await request.json();

  try {
    createAdminAccount(password || "");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (googleApiKey && googleApiKey.trim()) {
    setGoogleApiKey(googleApiKey.trim());
  }

  // Meteen inloggen na het aanmaken, zodat je niet apart nog hoeft in te
  // loggen met het wachtwoord dat je net zelf koos.
  let token;
  try {
    token = await computeSessionToken();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  const res = NextResponse.json({ success: true });

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || request.nextUrl.protocol === "https:";

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
