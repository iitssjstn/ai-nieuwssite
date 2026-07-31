import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

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
  "/api/users",
  "/api/polls",
  "/api/webhooks",
  "/api/keys",
];

// Subset die WEL alleen op het admin-subdomein mag bestaan, maar NIET zelf
// een geldige sessie mag vereisen — anders kun je nooit meer inloggen
// (de loginpagina zelf, en de login/logout-endpoints).
const AUTH_EXEMPT_PREFIXES = ["/login", "/api/auth"];

// Alleen voor de rol "admin" — redacteuren (rol "editor") mogen artikelen
// genereren/bewerken, maar geen bronnen/instellingen/gebruikers beheren.
const ADMIN_ONLY_PREFIXES = [
  "/review/sources",
  "/review/settings",
  "/review/webhooks",
  "/api/sources",
  "/api/settings",
  "/api/users",
  "/api/webhooks",
  "/api/keys",
];

// Uitzondering binnen een admin-only prefix — wél inloggen vereist, maar
// niet per se de rol "admin" (bijv. het "wie is online"-overzicht op het
// dashboard, dat voor elke redacteur zichtbaar hoort te zijn).
const ADMIN_ONLY_EXCEPTIONS = ["/api/users/online"];

// Routes die op BEIDE domeinen moeten blijven werken, ook al zijn ze geen
// "admin"-route — geüploade afbeeldingen moeten zichtbaar zijn zowel in de
// preview binnen het adminpaneel (admin-subdomein) als op de publieke site.
const SHARED_PATH_PREFIXES = ["/media"];

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
  // ADMIN_HOSTNAME is ingesteld. /media is op beide domeinen bereikbaar.
  if (adminHostname && !matchesPrefix(pathname, SHARED_PATH_PREFIXES)) {
    if (pathIsAdmin && !isAdminHost) {
      return new NextResponse("Not found", { status: 404 });
    }
    if (!pathIsAdmin && isAdminHost) {
      return NextResponse.redirect(new URL("/review", request.url));
    }
  }

  if (!pathIsAdmin) {
    return NextResponse.next();
  }

  if (matchesPrefix(pathname, AUTH_EXEMPT_PREFIXES)) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session;
  try {
    session = await verifySessionToken(cookie);
  } catch {
    const msg = "Serverconfiguratie ontbreekt (SESSION_SECRET).";
    return isApi
      ? NextResponse.json({ error: msg }, { status: 500 })
      : new NextResponse(msg + " De redactiepagina is geblokkeerd totdat dit is opgelost.", { status: 500 });
  }

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.role !== "admin" && matchesPrefix(pathname, ADMIN_ONLY_PREFIXES) && !matchesPrefix(pathname, ADMIN_ONLY_EXCEPTIONS)) {
    if (isApi) return NextResponse.json({ error: "Alleen voor admins" }, { status: 403 });
    return NextResponse.redirect(new URL("/review", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
