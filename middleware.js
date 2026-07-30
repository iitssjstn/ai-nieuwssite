import { NextResponse } from "next/server";
import { computeSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Routes die tot het admin-paneel horen. Alles hierbuiten is publieke site.
const ADMIN_PATH_PREFIXES = [
  "/review",
  "/login",
  "/api/generate",
  "/api/articles",
  "/api/sources",
  "/api/stats",
  "/api/auth",
  "/api/settings",
  "/api/uploads",
];

// Subset die WEL alleen op het admin-subdomein mag bestaan, maar NIET zelf
// een geldige sessie mag vereisen — anders kun je nooit meer inloggen
// (de loginpagina zelf, en de login/logout-endpoints).
const AUTH_EXEMPT_PREFIXES = ["/login", "/api/auth"];

function matchesPrefix(pathname, list) {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request) {
  const host = request.headers.get("host") || "";
  const adminHostname = process.env.ADMIN_HOSTNAME; // bv. "admin.novapers.nl"
  const isAdminHost = Boolean(adminHostname) && host === adminHostname;
  const pathname = request.nextUrl.pathname;
  const pathIsAdmin = matchesPrefix(pathname, ADMIN_PATH_PREFIXES);

  // Scheiding tussen hoofddomein en admin-subdomein — alleen actief als
  // ADMIN_HOSTNAME is ingesteld. Zonder die env-variabele werkt alles op
  // één host, zoals voorheen (handig voor lokaal ontwikkelen).
  if (adminHostname) {
    if (pathIsAdmin && !isAdminHost) {
      // Admin-routes bestaan simpelweg niet op het hoofddomein: een 404,
      // geen 403/redirect — zo is zelfs niet zichtbaar dát er een
      // adminpaneel bestaat voor wie op het hoofddomein rondkijkt.
      return new NextResponse("Not found", { status: 404 });
    }
    if (!pathIsAdmin && isAdminHost) {
      // Op het admin-subdomein bestaat de publieke site niet — alles stuurt
      // door naar het dashboard.
      return NextResponse.redirect(new URL("/review", request.url));
    }
  }

  if (!pathIsAdmin) {
    return NextResponse.next();
  }

  // /login en /api/auth/* moeten bereikbaar blijven zonder geldige sessie —
  // dat zijn precies de routes die je nodig hebt óm in te loggen.
  if (matchesPrefix(pathname, AUTH_EXEMPT_PREFIXES)) {
    return NextResponse.next();
  }

  // Vanaf hier: dezelfde wachtwoord-/sessiecheck als voorheen, nu alleen
  // nog van toepassing op admin-routes (op de juiste host).
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isApi = pathname.startsWith("/api/");

  let expected;
  try {
    expected = await computeSessionToken();
  } catch {
    if (isApi) {
      return NextResponse.json(
        { error: "Serverconfiguratie ontbreekt (SESSION_SECRET)." },
        { status: 500 }
      );
    }
    return new NextResponse(
      "Serverconfiguratie ontbreekt: SESSION_SECRET is niet ingesteld. De redactiepagina is daarom geblokkeerd totdat dit is opgelost.",
      { status: 500 }
    );
  }

  if (cookie === expected) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
