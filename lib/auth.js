// Edge-veilig (gebruikt door middleware.js): alleen process.env en Web
// Crypto, geen fs/bcrypt. Het wachtwoord zelf (of de hash ervan) staat hier
// bewust NIET meer in — dat leeft nu in data/db.json, beheerd via het
// eenmalige setup-account-scherm. Middleware hoeft alleen te verifiëren dat
// een sessiecookie correct ondertekend is met SESSION_SECRET, niet wélk
// wachtwoord daarachter zit.

export const SESSION_COOKIE_NAME = "admin_session";
const SESSION_PAYLOAD = "admin-authenticated-v1";

export async function computeSessionToken() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ontbreekt. Zie README.");
  }
  const data = new TextEncoder().encode(`${SESSION_PAYLOAD}::${secret}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
