// Node.js-only (nooit door middleware.js gebruikt — bcryptjs werkt niet in
// de Edge Runtime). Wachtwoord-hashes staan in data/db.json, niet in
// environment-variabelen of Docker Secrets.
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  hasAnyUser, getUserByUsername, getUserById, createUser, updateUserPasswordHash,
  createApiKeyRecord, getApiKeyHashes, regenerateInviteLink, completeInvite,
} from "./db.js";

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

export function createEditorAccount(username, password, role, profile = {}) {
  validateCredentials(username, password);
  const hash = bcrypt.hashSync(password, 12);
  return createUser({ username, password_hash: hash, role, ...profile });
}

export function setUserPassword(id, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Wachtwoord moet minstens 8 tekens zijn.");
  }
  const hash = bcrypt.hashSync(newPassword, 12);
  return updateUserPasswordHash(id, hash);
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

// De ruwe key wordt maar één keer getoond (bij aanmaken) — daarna staat
// alleen de hash opgeslagen, net als bij wachtwoorden.
export function createApiKey(name) {
  const rawKey = "nova_" + crypto.randomBytes(24).toString("hex");
  const hash = bcrypt.hashSync(rawKey, 10);
  createApiKeyRecord({ name, key_hash: hash });
  return rawKey;
}

export async function verifyApiKey(rawKey) {
  if (!rawKey) return false;
  const keys = getApiKeyHashes();
  for (const k of keys) {
    if (await bcrypt.compare(rawKey, k.key_hash)) return true;
  }
  return false;
}

// Maakt een account aan ZONDER wachtwoord — alleen een gebruikersnaam
// (afgeleid van het e-mailadres, tenzij expliciet meegegeven) en een
// uitnodigingstoken. De admin hoeft dus alleen het e-mailadres van de
// redacteur te weten; de redacteur stelt zelf het wachtwoord in via de
// uitnodigingslink.
export function createInvite({ username, role, full_name, email, phone, address }) {
  if (!username || username.trim().length < 3) {
    throw new Error("Gebruikersnaam moet minstens 3 tekens zijn.");
  }
  const token = crypto.randomBytes(24).toString("hex");
  const user = createUser({
    username: username.trim(),
    password_hash: null,
    role,
    full_name, email, phone, address,
    invite_token: token,
    invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return { user, inviteToken: token };
}

// Genereert een nieuw token voor een bestaand account (bijv. omdat de
// vorige link is verlopen, of de eerste e-mail nooit is aangekomen).
export function regenerateInvite(id) {
  const token = regenerateInviteLink(id);
  if (!token) throw new Error("Gebruiker niet gevonden.");
  return token;
}

// Rondt een uitnodiging af: de redacteur kiest hier zelf zijn wachtwoord.
export function acceptInvite(token, password) {
  if (!password || password.length < 8) {
    throw new Error("Wachtwoord moet minstens 8 tekens zijn.");
  }
  const hash = bcrypt.hashSync(password, 12);
  const ok = completeInvite(token, hash);
  if (!ok) throw new Error("Deze uitnodigingslink is ongeldig of verlopen.");
  return true;
}

// Self-service wachtwoord wijzigen — vereist het HUIDIGE wachtwoord ter
// verificatie, ongeacht welke rol de gebruiker heeft. Dit is bewust anders
// dan de admin-only setUserPassword hierboven (waarbij een admin het
// wachtwoord van een ánder account kan resetten zonder dat te kennen).
export async function changeOwnPassword(id, currentPassword, newPassword) {
  const user = getUserById(id);
  if (!user) throw new Error("Gebruiker niet gevonden.");
  const ok = await bcrypt.compare(currentPassword || "", user.password_hash);
  if (!ok) throw new Error("Huidig wachtwoord is onjuist.");
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Nieuw wachtwoord moet minstens 8 tekens zijn.");
  }
  const hash = bcrypt.hashSync(newPassword, 12);
  updateUserPasswordHash(id, hash);
  return true;
}
