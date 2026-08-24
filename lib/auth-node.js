// Node.js-only (never used by middleware.js — bcryptjs doesn't work in
// the Edge Runtime). Password hashes live in data/db.json, not in
// environment variables or Docker Secrets.
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  hasAnyUser, getUserByUsername, getUserById, createUser, updateUserPasswordHash,
  createApiKeyRecord, getApiKeyHashes, regenerateInviteLink, completeInvite,
} from "./db.js";

export function hasAdminAccount() {
  return hasAnyUser();
}

// Creates the very first account (always role "admin") — can only be
// done once, after that user management goes through the admin account itself.
export function createAdminAccount(username, password) {
  if (hasAnyUser()) {
    throw new Error("An account already exists.");
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
    throw new Error("Password must be at least 8 characters.");
  }
  const hash = bcrypt.hashSync(newPassword, 12);
  return updateUserPasswordHash(id, hash);
}

function validateCredentials(username, password) {
  if (!username || username.trim().length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

// Returns the user (without hash) on correct login credentials, otherwise
// null. Used by the login route to both verify and immediately retrieve
// the data for the session token.
export async function verifyCredentials(username, password) {
  const user = getUserByUsername(username || "");
  if (!user) return null;
  const ok = await bcrypt.compare(password || "", user.password_hash);
  if (!ok) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

// The raw key is only shown once (at creation) — after that only
// the hash is stored, just like with passwords.
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

// Creates an account WITHOUT a password — just a username
// (derived from the email address, unless explicitly provided) and an
// invitation token. So the admin only needs to know the editor's
// email address; the editor sets their own password via the
// invitation link.
export function createInvite({ username, role, full_name, email, phone, address }) {
  if (!username || username.trim().length < 3) {
    throw new Error("Username must be at least 3 characters.");
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

// Generates a new token for an existing account (e.g. because the
// previous link expired, or the first email never arrived).
export function regenerateInvite(id) {
  const token = regenerateInviteLink(id);
  if (!token) throw new Error("User not found.");
  return token;
}

// Completes an invitation: the editor chooses their own password here.
export function acceptInvite(token, password) {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const hash = bcrypt.hashSync(password, 12);
  const ok = completeInvite(token, hash);
  if (!ok) throw new Error("This invitation link is invalid or expired.");
  return true;
}

// Self-service password change — requires the CURRENT password for
// verification, regardless of the user's role. This is deliberately different
// from the admin-only setUserPassword above (where an admin can reset
// another account's password without knowing it).
export async function changeOwnPassword(id, currentPassword, newPassword) {
  const user = getUserById(id);
  if (!user) throw new Error("User not found.");
  const ok = await bcrypt.compare(currentPassword || "", user.password_hash);
  if (!ok) throw new Error("Current password is incorrect.");
  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
  const hash = bcrypt.hashSync(newPassword, 12);
  updateUserPasswordHash(id, hash);
  return true;
}
