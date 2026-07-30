// Node.js-only (nooit door middleware.js gebruikt — bcryptjs werkt niet in
// de Edge Runtime). Wachtwoord-hashes staan in data/db.json, niet in
// environment-variabelen of Docker Secrets.
import bcrypt from "bcryptjs";
import { hasAnyUser, getUserByUsername, createUser } from "./db";

export function hasAdminAccount() {
  return hasAnyUser();
}

// Maakt het allereerste account aan (altijd rol "admin") — kan maar één
// keer, daarna verloopt gebruikersbeheer via het admin-account zelf.
export function createAdminAccount(username, password) {
  if (hasAnyUser()) {
    throw new Error("Er bestaat al een account.");
  }
  validateCredentials(username, password);
  const hash = bcrypt.hashSync(password, 12);
  return createUser({ username, password_hash: hash, role: "admin" });
}

export function createEditorAccount(username, password, role) {
  validateCredentials(username, password);
  const hash = bcrypt.hashSync(password, 12);
  return createUser({ username, password_hash: hash, role });
}

function validateCredentials(username, password) {
  if (!username || username.trim().length < 3) {
    throw new Error("Gebruikersnaam moet minstens 3 tekens zijn.");
  }
  if (!password || password.length < 8) {
    throw new Error("Wachtwoord moet minstens 8 tekens zijn.");
  }
}

// Geeft de gebruiker (zonder hash) terug bij correcte inloggegevens, anders
// null. Gebruikt door de login-route om zowel te verifiëren als meteen de
// gegevens voor het sessietoken op te halen.
export async function verifyCredentials(username, password) {
  const user = getUserByUsername(username || "");
  if (!user) return null;
  const ok = await bcrypt.compare(password || "", user.password_hash);
  if (!ok) return null;
  const { password_hash, ...safe } = user;
  return safe;
}
