import { NextResponse } from "next/server";
import { computeSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { verifyPassword } from "@/lib/auth-node";

export async function POST(request) {
  const { password } = await request.json();

  const ok = await verifyPassword(password || "");
  if (!ok) {
    return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });
  }

  let token;
  try {
    token = await computeSessionToken();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  const res = NextResponse.json({ success: true });

  // Alleen "Secure" zetten als de binnenkomende request ook echt via HTTPS
  // loopt. NODE_ENV === "production" zegt daar niets over — die is ook
  // "production" als je (nog) via gewone HTTP binnenkomt, bijvoorbeeld
  // direct op http://ip:3000 of vóórdat certbot is ingesteld. Een cookie
  // met Secure=true wordt door de browser stilzwijgend genegeerd op een
  // niet-HTTPS pagina, wat live aanvoelde als "inloggen doet niets".
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || request.nextUrl.protocol === "https:";

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dagen
  });
  return res;
}
