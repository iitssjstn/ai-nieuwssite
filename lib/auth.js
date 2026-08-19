// Edge-veilig (gebruikt door middleware.js): alleen process.env, Web Crypto
// en standaard btoa/atob — geen fs/bcrypt, dus geen toegang tot data/db.json
// nodig. De sessiecookie is nu een ondertekend token dat de gebruikers-ID en
// rol zelf bevat, zodat middleware kan controleren wélke rol iemand heeft
// zonder het gebruikersbestand te hoeven lezen (wat in de Edge Runtime
// sowieso niet kan).

export const SESSION_COOKIE_NAME = "admin_session";

// Zonder een expliciet "domain" is een cookie alleen geldig voor exact de
// host waarvandaan 'ie gezet is (admin.novapers.nl) — de publieke site
// (novapers.nl) zou dan nooit kunnen zien dat een bezoeker eigenlijk de
// ingelogde admin/redacteur is (bijv. om diens eigen bezoekjes niet mee te
// tellen in de statistieken). Door het domein te zetten op het kale
// hoofddomein (zonder "admin."-voorvoegsel) geldt het cookie voor beide.
// Werkt alleen als ADMIN_HOSTNAME daadwerkelijk als "admin.iets" is
// opgezet — anders (bijv. lokaal draaien zonder subdomein-scheiding) blijft
// het cookie gewoon aan de exacte host gebonden, zoals voorheen.
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
  if (!secret) throw new Error("SESSION_SECRET ontbreekt. Zie README.");
  return secret;
}

export async function createSessionToken({ userId, username, role }) {
  const secret = getSecret();
  const payload = JSON.stringify({ userId, username, role, iat: Date.now() });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

// Geeft de payload {userId, username, role, iat} terug als het token geldig
// is, anders null. Verifieert alleen de handtekening — leest geen bestand.
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
