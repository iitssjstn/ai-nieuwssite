import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, getCookieDomain } from "@/lib/auth";
import { verifyCredentials } from "@/lib/auth-node";

export async function POST(request) {
  const { username, password } = await request.json();

  const user = await verifyCredentials(username || "", password || "");
  if (!user) {
    return NextResponse.json({ error: "Onjuiste gebruikersnaam of wachtwoord" }, { status: 401 });
  }

  let token;
  try {
    token = await createSessionToken({ userId: user.id, username: user.username, role: user.role });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  const res = NextResponse.json({ success: true, user: { username: user.username, role: user.role } });

  // Alleen "Secure" zetten als de binnenkomende request ook echt via HTTPS
  // loopt — zie eerdere aantekening: anders wordt de cookie stil genegeerd.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || request.nextUrl.protocol === "https:";

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dagen
    domain: getCookieDomain(request),
  });
  return res;
}
