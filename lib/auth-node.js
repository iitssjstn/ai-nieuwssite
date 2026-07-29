// Node.js-only (nooit door middleware.js gebruikt — bcryptjs werkt niet in
// de Edge Runtime). Het admin-wachtwoord (als bcrypt-hash) staat in
// data/db.json, niet in environment-variabelen of Docker Secrets.
import bcrypt from "bcryptjs";
import { getAdminPasswordHash, setAdminPasswordHash } from "./db";

export function hasAdminAccount() {
  return Boolean(getAdminPasswordHash());
}

export function createAdminAccount(password) {
  if (getAdminPasswordHash()) {
    throw new Error("Er bestaat al een admin-account.");
  }
  if (!password || password.length < 8) {
    throw new Error("Wachtwoord moet minstens 8 tekens zijn.");
  }
  const hash = bcrypt.hashSync(password, 12);
  setAdminPasswordHash(hash);
}

export async function verifyPassword(inputPassword) {
  const hash = getAdminPasswordHash();
  if (!hash) return false;
  return bcrypt.compare(inputPassword, hash);
}
