import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function read() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getSources() {
  return read().sources;
}

export function getArticles({ status } = {}) {
  const data = read();
  if (status) return data.articles.filter((a) => a.status === status);
  return data.articles;
}

export function getArticle(id) {
  return read().articles.find((a) => a.id === id);
}

export function createArticle(article) {
  const data = read();
  const newArticle = {
    id: crypto.randomUUID(),
    status: "pending_review",
    confidence_score: null,
    flags: {},
    reviewer_id: null,
    reviewed_at: null,
    published_at: null,
    created_at: new Date().toISOString(),
    views: 0,
    breaking: false,
    ...article,
  };
  data.articles.unshift(newArticle);
  write(data);
  return newArticle;
}

export function incrementViews(id) {
  const data = read();
  const idx = data.articles.findIndex((a) => a.id === id);
  if (idx === -1) return;
  data.articles[idx].views = (data.articles[idx].views || 0) + 1;
  write(data);
}

export function updateArticle(id, updates) {
  const data = read();
  const idx = data.articles.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  data.articles[idx] = { ...data.articles[idx], ...updates };
  write(data);
  return data.articles[idx];
}

export function deleteArticle(id) {
  const data = read();
  const idx = data.articles.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  data.articles.splice(idx, 1);
  write(data);
  return true;
}

export function addSource(source) {
  const data = read();
  const newSource = {
    id: "src-" + source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + crypto.randomUUID().slice(0, 4),
    trust_level: "other",
    feed_url: "",
    ...source,
  };
  data.sources.push(newSource);
  write(data);
  return newSource;
}

export function deleteSource(id) {
  const data = read();
  const idx = data.sources.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  data.sources.splice(idx, 1);
  write(data);
  return true;
}

export function getStats() {
  const data = read();
  const counts = { published: 0, pending_review: 0, rejected: 0 };
  for (const a of data.articles) {
    if (counts[a.status] != null) counts[a.status]++;
  }
  return {
    ...counts,
    total: data.articles.length,
    sources: data.sources.length,
  };
}

export function getProviderConfig(providerId) {
  const data = read();
  const cfg = data.settings?.ai_providers?.[providerId];
  if (cfg && cfg.api_key) return cfg;
  if (providerId === "google" && data.settings?.google_api_key) {
    return { api_key: data.settings.google_api_key, model: null };
  }
  return null;
}

export function setProviderConfig(providerId, { api_key, model } = {}) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.ai_providers = data.settings.ai_providers || {};
  const existing = data.settings.ai_providers[providerId] || {};
  data.settings.ai_providers[providerId] = {
    api_key: api_key !== undefined ? api_key : existing.api_key ?? null,
    model: model !== undefined ? model : existing.model ?? null,
  };
  write(data);
}

export function getGoogleApiKey() {
  return getProviderConfig("google")?.api_key || null;
}

export function setGoogleApiKey(key) {
  setProviderConfig("google", { api_key: key });
}

export function getAdminPasswordHash() {
  const data = read();
  return data.admin?.password_hash || null;
}

export function setAdminPasswordHash(hash) {
  const data = read();
  data.admin = { password_hash: hash, created_at: new Date().toISOString() };
  write(data);
}

export function addReviewLogEntry(entry) {
  const data = read();
  data.review_log.unshift({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...entry,
  });
  write(data);
}
