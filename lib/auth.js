// Edge-safe (used by middleware.js): only process.env, Web Crypto,
// and standard btoa/atob — no fs/bcrypt, so no access to data/db.json
// needed. The session cookie is now a signed token that carries the user ID
// and role itself, so middleware can check which role someone has
// without needing to read the user file (which isn't possible
// in the Edge Runtime anyway).

export const SESSION_COOKIE_NAME = "admin_session";

// Without an explicit "domain", a cookie is only valid for exactly the
// host it was set from (admin.novapers.nl) — the public site
// (novapers.nl) would then never be able to see that a visitor is actually
// the logged-in admin/editor (e.g. to exclude their own visits
// from the stats). By setting the domain to the bare
// root domain (without the "admin." prefix), the cookie applies to both.
// Only works if ADMIN_HOSTNAME is actually set up as "admin.something" —
// otherwise (e.g. running locally without subdomain separation) the
// cookie simply stays bound to the exact host, as before.
export function getCookieDomain(request) {
  const host = (request.headers.get("host") || "").split(":")[0];
  return host.startsWith("admin.") ? host.slice("admin.".length) : undefined;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(payloadB64, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return toBase64Url(new Uint8Array(sig));
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is missing. See README.");
  return secret;
}

export async function createSessionToken({ userId, username, role }) {
  const secret = getSecret();
  const payload = JSON.stringify({ userId, username, role, iat: Date.now() });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

// Returns the payload {userId, username, role, iat} if the token is valid,
// otherwise null. Only verifies the signature — doesn't read any file.
export async function verifySessionToken(token) {
  if (!token) return null;
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  const expectedSig = await hmacSign(payloadB64, secret);
  if (expectedSig !== sig) return null;

  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(cookie);
}
