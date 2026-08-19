import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCookieDomain } from "@/lib/auth";

export async function POST(request) {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0, domain: getCookieDomain(request) });
  return res;
}
