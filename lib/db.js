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

function slugify(title) {
  return (title || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "artikel";
}

function generateUniqueSlug(title, data) {
  const base = slugify(title);
  const existing = new Set(data.articles.map((a) => a.slug).filter(Boolean));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// Artikelen die "ingepland" staan en waarvan de tijd is verstreken, worden
// hier automatisch gepubliceerd — bij elke lees-actie, dus zonder dat er
// een aparte achtergrondtaak/cron nodig is.
function promoteScheduledArticles(data) {
  const now = Date.now();
  let changed = false;
  for (const a of data.articles) {
    if (a.status === "scheduled" && a.scheduled_at && new Date(a.scheduled_at).getTime() <= now) {
      a.status = "published";
      a.published_at = a.scheduled_at;
      changed = true;
    }
  }
  return changed;
}

// Artikelen die al bestonden vóórdat slugs werden geïntroduceerd, krijgen
// hier alsnog automatisch een slug — geen handmatige migratie nodig.
function backfillSlugs(data) {
  let changed = false;
  for (const a of data.articles) {
    if (!a.slug) {
      a.slug = generateUniqueSlug(a.title, data);
      changed = true;
    }
  }
  return changed;
}

export function getSources() {
  return read().sources;
}

export function getArticles({ status } = {}) {
  const data = read();
  let changed = backfillSlugs(data);
  if (promoteScheduledArticles(data)) changed = true;
  if (changed) write(data);
  if (status) return data.articles.filter((a) => a.status === status);
  return data.articles;
}

export function getArticle(id) {
  const data = read();
  let changed = backfillSlugs(data);
  if (promoteScheduledArticles(data)) changed = true;
  if (changed) write(data);
  return data.articles.find((a) => a.id === id);
}

export function getArticleBySlug(slug) {
  const data = read();
  let changed = backfillSlugs(data);
  if (promoteScheduledArticles(data)) changed = true;
  if (changed) write(data);
  return data.articles.find((a) => a.slug === slug);
}

export function createArticle(article) {
  const data = read();
  const slug = article.slug || generateUniqueSlug(article.title || "artikel", data);
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
    featured_image: null,
    featured_image_credit: null,
    is_liveblog: false,
    featured: false,
    featured_at: null,
    liveblog_updates: [],
    location: null,
    poll_id: null,
    claims: [],
    source_url: null,
    additional_sources: [],
    slug,
    tags: [],
    scheduled_at: null,
    revisions: [],
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

  const day = new Date().toISOString().slice(0, 10);
  data.article_views_by_day = data.article_views_by_day || {};
  data.article_views_by_day[day] = data.article_views_by_day[day] || {};
  data.article_views_by_day[day][id] = (data.article_views_by_day[day][id] || 0) + 1;

  write(data);
}

export function getTopArticles(days = 1) {
  const data = read();
  const totals = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayData = data.article_views_by_day?.[key] || {};
    for (const [articleId, count] of Object.entries(dayData)) {
      totals[articleId] = (totals[articleId] || 0) + count;
    }
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([articleId, views]) => {
      const article = data.articles.find((a) => a.id === articleId);
      return article ? { id: article.id, slug: article.slug, title: article.title, views } : null;
    })
    .filter(Boolean);
}

export function updateArticle(id, updates) {
  const data = read();
  const idx = data.articles.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  data.articles[idx] = { ...data.articles[idx], ...updates };
  write(data);
  return data.articles[idx];
}

// Bewaart de huidige titel/body/afbeelding als revisie vóórdat de nieuwe
// waarden worden toegepast — zo kan een redacteur altijd terug naar een
// eerdere versie. Maximaal 20 revisies per artikel, oudste vallen eraf.
export function editArticleWithRevision(id, { title, body, featured_image, featured_image_credit }) {
  const data = read();
  const idx = data.articles.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const existing = data.articles[idx];
  const revisions = existing.revisions || [];
  revisions.unshift({
    title: existing.title,
    body: existing.body,
    featured_image: existing.featured_image ?? null,
    edited_at: new Date().toISOString(),
  });

  data.articles[idx] = {
    ...existing,
    title: title ?? existing.title,
    body: body ?? existing.body,
    featured_image: featured_image !== undefined ? featured_image : existing.featured_image,
    featured_image_credit: featured_image_credit !== undefined ? featured_image_credit : existing.featured_image_credit,
    revisions: revisions.slice(0, 20),
  };
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
    imported_guids: [],
    ...source,
  };
  data.sources.push(newSource);
  write(data);
  return newSource;
}

export function markGuidsImported(sourceId, guids) {
  const data = read();
  const src = data.sources.find((s) => s.id === sourceId);
  if (!src) return;
  src.imported_guids = [...new Set([...(src.imported_guids || []), ...guids])].slice(-500);
  write(data);
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
  if (promoteScheduledArticles(data)) write(data);
  const counts = { published: 0, pending_review: 0, approved: 0, rejected: 0, scheduled: 0, archived: 0 };
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
  // Terugvalcompatibiliteit met de oude, losse Google-key van vóór de
  // meerdere-providers-architectuur.
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

export function getImageProviderConfig(providerId) {
  const data = read();
  return data.settings?.image_providers?.[providerId] || null;
}

export function setImageProviderConfig(providerId, { api_key } = {}) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.image_providers = data.settings.image_providers || {};
  data.settings.image_providers[providerId] = { api_key };
  write(data);
}

export function getAutomationSettings() {
  const data = read();
  return {
    enabled: data.settings?.automation?.enabled !== false, // standaard aan, tenzij expliciet uitgezet
    max_per_source: data.settings?.automation?.max_per_source ?? 5,
  };
}

export function setAutomationSettings({ enabled, max_per_source }) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.automation = {
    enabled: enabled !== undefined ? enabled : (data.settings.automation?.enabled ?? true),
    max_per_source: max_per_source !== undefined ? max_per_source : (data.settings.automation?.max_per_source ?? 5),
  };
  write(data);
}

export function getAdsenseClientId() {
  const data = read();
  return data.settings?.adsense_client_id || null;
}

export function setAdsenseClientId(clientId) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.adsense_client_id = clientId;
  write(data);
}

// Migreert het oude enkel-account-systeem (data.admin.password_hash) naar
// het nieuwe meerdere-gebruikers-model, de eerste keer dat erom gevraagd
// wordt. Bestaande installaties verliezen zo hun account niet.
function migrateUsersIfNeeded(data) {
  if (data.users) return false;
  data.users = [];
  if (data.admin?.password_hash) {
    data.users.push({
      id: crypto.randomUUID(),
      username: "admin",
      password_hash: data.admin.password_hash,
      role: "admin",
      created_at: data.admin.created_at || new Date().toISOString(),
    });
  }
  return true;
}

export function hasAnyUser() {
  const data = read();
  if (migrateUsersIfNeeded(data)) write(data);
  return data.users.length > 0;
}

export function getUsers() {
  const data = read();
  if (migrateUsersIfNeeded(data)) write(data);
  // Nooit de hash zelf teruggeven aan de aanroeper.
  return data.users.map(({ password_hash, ...rest }) => rest);
}

export function getUserByUsername(username) {
  const data = read();
  if (migrateUsersIfNeeded(data)) write(data);
  return data.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export function getUserById(id) {
  const data = read();
  if (migrateUsersIfNeeded(data)) write(data);
  return data.users.find((u) => u.id === id) || null;
}

export function createUser({ username, password_hash, role, full_name, email, phone, address }) {
  const data = read();
  migrateUsersIfNeeded(data);
  if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Deze gebruikersnaam bestaat al.");
  }
  const user = {
    id: crypto.randomUUID(),
    username,
    password_hash,
    role: role === "admin" ? "admin" : "editor",
    full_name: full_name || null,
    email: email || null,
    phone: phone || null,
    address: address || null,
    last_active: null,
    created_at: new Date().toISOString(),
  };
  data.users.push(user);
  write(data);
  const { password_hash: _drop, ...safe } = user;
  return safe;
}

export function updateUser(id, { full_name, email, phone, address, role, username }) {
  const data = read();
  migrateUsersIfNeeded(data);
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  if (username !== undefined && username.toLowerCase() !== data.users[idx].username.toLowerCase()) {
    if (data.users.some((u, i) => i !== idx && u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Deze gebruikersnaam bestaat al.");
    }
  }

  // De laatste admin mag niet gedegradeerd worden naar redacteur — zelfde
  // bescherming als bij verwijderen, anders kan niemand meer bij beheer.
  if (role !== undefined && role !== "admin" && data.users[idx].role === "admin") {
    const remainingAdmins = data.users.filter((u, i) => u.role === "admin" && i !== idx);
    if (remainingAdmins.length === 0) {
      throw new Error("Kan de laatste admin niet degraderen naar redacteur.");
    }
  }

  data.users[idx] = {
    ...data.users[idx],
    username: username !== undefined ? username : data.users[idx].username,
    full_name: full_name !== undefined ? full_name : data.users[idx].full_name,
    email: email !== undefined ? email : data.users[idx].email,
    phone: phone !== undefined ? phone : data.users[idx].phone,
    address: address !== undefined ? address : data.users[idx].address,
    role: role !== undefined ? (role === "admin" ? "admin" : "editor") : data.users[idx].role,
  };
  write(data);
  const { password_hash: _drop, ...safe } = data.users[idx];
  return safe;
}

export function updateUserPasswordHash(id, password_hash) {
  const data = read();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  data.users[idx].password_hash = password_hash;
  write(data);
  return true;
}

export function touchUserLastActive(id) {
  const data = read();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return;
  data.users[idx].last_active = new Date().toISOString();
  write(data);
}

// "Online" is een gok op basis van hoe recent iemand voor het laatst een
// heartbeat stuurde — er is geen echte serverzijdige sessie-registratie
// (de sessietokens zijn stateless), dus dit is een benadering.
export function getOnlineUsers(thresholdMinutes = 2) {
  const data = read();
  const cutoff = Date.now() - thresholdMinutes * 60 * 1000;
  return (data.users || [])
    .filter((u) => u.last_active && new Date(u.last_active).getTime() >= cutoff)
    .map(({ password_hash, ...rest }) => rest);
}

export function deleteUser(id) {
  const data = read();
  migrateUsersIfNeeded(data);
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  // De laatste admin mag niet verwijderd worden — anders kan niemand meer
  // bij de instellingen/gebruikersbeheer komen.
  const remainingAdmins = data.users.filter((u, i) => u.role === "admin" && i !== idx);
  if (data.users[idx].role === "admin" && remainingAdmins.length === 0) {
    throw new Error("Kan de laatste admin-account niet verwijderen.");
  }
  data.users.splice(idx, 1);
  write(data);
  return true;
}

export function addLiveblogUpdate(articleId, { text, author }) {
  const data = read();
  const idx = data.articles.findIndex((a) => a.id === articleId);
  if (idx === -1) return null;
  const update = {
    id: crypto.randomUUID(),
    text,
    author: author || "onbekend",
    created_at: new Date().toISOString(),
  };
  data.articles[idx].liveblog_updates = data.articles[idx].liveblog_updates || [];
  data.articles[idx].liveblog_updates.unshift(update);
  write(data);
  return data.articles[idx];
}

export function deleteLiveblogUpdate(articleId, updateId) {
  const data = read();
  const idx = data.articles.findIndex((a) => a.id === articleId);
  if (idx === -1) return null;
  data.articles[idx].liveblog_updates = (data.articles[idx].liveblog_updates || []).filter((u) => u.id !== updateId);
  write(data);
  return data.articles[idx];
}

export function getPolls() {
  const data = read();
  return data.polls || [];
}

export function getPoll(id) {
  const data = read();
  return (data.polls || []).find((p) => p.id === id) || null;
}

export function createPoll({ question, options, article_id }) {
  const data = read();
  data.polls = data.polls || [];
  const poll = {
    id: crypto.randomUUID(),
    question,
    options: options.map((text) => ({ id: crypto.randomUUID(), text, votes: 0 })),
    article_id: article_id || null,
    active: true,
    created_at: new Date().toISOString(),
  };
  data.polls.unshift(poll);
  write(data);
  return poll;
}

export function votePoll(pollId, optionId) {
  const data = read();
  const poll = (data.polls || []).find((p) => p.id === pollId);
  if (!poll) return null;
  const option = poll.options.find((o) => o.id === optionId);
  if (!option) return null;
  option.votes += 1;
  write(data);
  return poll;
}

export function deletePoll(id) {
  const data = read();
  data.polls = (data.polls || []).filter((p) => p.id !== id);
  write(data);
  return true;
}

export function togglePollActive(id) {
  const data = read();
  const poll = (data.polls || []).find((p) => p.id === id);
  if (!poll) return null;
  poll.active = !poll.active;
  write(data);
  return poll;
}

export function getWebhooks() {
  const data = read();
  return data.webhooks || [];
}

export function createWebhook({ url, events }) {
  const data = read();
  data.webhooks = data.webhooks || [];
  const webhook = {
    id: crypto.randomUUID(),
    url,
    events: events && events.length ? events : ["article.published"],
    secret: crypto.randomBytes(24).toString("hex"),
    active: true,
    created_at: new Date().toISOString(),
  };
  data.webhooks.push(webhook);
  write(data);
  return webhook;
}

export function deleteWebhook(id) {
  const data = read();
  data.webhooks = (data.webhooks || []).filter((w) => w.id !== id);
  write(data);
  return true;
}

export function toggleWebhookActive(id) {
  const data = read();
  const webhook = (data.webhooks || []).find((w) => w.id === id);
  if (!webhook) return null;
  webhook.active = !webhook.active;
  write(data);
  return webhook;
}

export function getApiKeys() {
  const data = read();
  return (data.api_keys || []).map(({ key_hash, ...rest }) => rest);
}

export function createApiKeyRecord({ name, key_hash }) {
  const data = read();
  data.api_keys = data.api_keys || [];
  const record = { id: crypto.randomUUID(), name, key_hash, created_at: new Date().toISOString() };
  data.api_keys.push(record);
  write(data);
  return record;
}

export function getApiKeyHashes() {
  const data = read();
  return data.api_keys || [];
}

export function deleteApiKey(id) {
  const data = read();
  data.api_keys = (data.api_keys || []).filter((k) => k.id !== id);
  write(data);
  return true;
}

export function getCategoryStats() {
  const data = read();
  const totals = {};
  for (const a of data.articles) {
    if (a.status !== "published") continue;
    const cat = a.category || "Overig";
    totals[cat] = (totals[cat] || 0) + (a.views || 0);
  }
  return Object.entries(totals)
    .map(([category, views]) => ({ category, views }))
    .sort((a, b) => b.views - a.views);
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

// Simpele, transparante gelijkenis-check op basis van woordoverlap in de
// titel — geen zware taalkundige analyse, maar genoeg om een redacteur te
// waarschuwen bij een waarschijnlijk dubbel artikel.
function titleSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

export function findPossibleDuplicate(title, excludeId = null) {
  const data = read();
  let best = null;
  for (const a of data.articles) {
    if (a.id === excludeId || a.status === "rejected") continue;
    const score = titleSimilarity(title, a.title);
    if (score >= 0.6 && (!best || score > best.score)) {
      best = { id: a.id, slug: a.slug, title: a.title, status: a.status, score: Math.round(score * 100) };
    }
  }
  return best;
}

export function incrementPageview() {
  const data = read();
  const day = new Date().toISOString().slice(0, 10);
  data.pageviews = data.pageviews || {};
  data.pageviews[day] = (data.pageviews[day] || 0) + 1;
  write(data);
}

export function getPageviewStats(days = 14) {
  const data = read();
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, views: data.pageviews?.[key] || 0 });
  }
  return result;
}
