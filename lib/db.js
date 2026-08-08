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
    updated_at: null,
    last_update_summary: null,
    pending_update: null,
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
export function editArticleWithRevision(id, { title, body, featured_image, featured_image_credit, category }) {
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
    category: category ?? existing.category,
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
  const pending_updates = data.articles.filter((a) => a.pending_update).length;
  return {
    ...counts,
    total: data.articles.length,
    sources: data.sources.length,
    pending_updates,
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

// Aangepaste providers die de admin zelf toevoegt (naast de ingebouwde
// Pexels/Unsplash/Pixabay) — bevat alleen de SCHEMA (URL-sjabloon,
// authenticatiewijze, veldmappings), niet de API-key zelf. De key wordt
// via de bestaande getImageProviderConfig/setImageProviderConfig-functies
// hierboven opgeslagen, op basis van hetzelfde providerId.
export function getCustomImageProviders() {
  const data = read();
  return data.settings?.custom_image_providers || [];
}

export function setCustomImageProviders(providers) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.custom_image_providers = providers;
  write(data);
}

// Bouwt in één keer de volledige set provider-configs (key's) op — de drie
// ingebouwde providers plus alle door de admin zelf toegevoegde providers,
// op basis van hun id. Voorkomt dat elke aanroepplek dit los moet opbouwen.
export function getAllImageProviderConfigs() {
  const configs = {
    pexels: getImageProviderConfig("pexels"),
    unsplash: getImageProviderConfig("unsplash"),
    pixabay: getImageProviderConfig("pixabay"),
  };
  for (const provider of getCustomImageProviders()) {
    configs[provider.id] = getImageProviderConfig(provider.id);
  }
  return configs;
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
    auto_publish: data.settings?.automation?.auto_publish === true, // standaard UIT — bewust opt-in
    auto_publish_min_confidence: data.settings?.automation?.auto_publish_min_confidence ?? 0.85,
    // Nieuwe bronnen die over hetzelfde onderwerp gaan als een concept dat
    // nog in de wachtrij staat automatisch samenvoegen i.p.v. een los
    // duplicaat-artikel aan te maken — standaard AAN, want er komt hoe dan
    // ook nog menselijke review aan te pas vóór publicatie.
    auto_gather_sources: data.settings?.automation?.auto_gather_sources !== false,
    // Al GEPUBLICEERDE artikelen automatisch bijwerken zodra een nieuwe
    // bron relevante aanvullende informatie bevat — standaard UIT, net als
    // auto_publish, want dit verandert content die al live staat.
    auto_update_published: data.settings?.automation?.auto_update_published === true,
    auto_update_min_confidence: data.settings?.automation?.auto_update_min_confidence ?? 0.85,
    // Een afbeelding gebruiken die de bron ZELF in hun RSS-feed meelevert,
    // i.p.v. een stockfoto te zoeken — standaard UIT, want die foto is
    // vaak eigendom van de bron/fotograaf en zonder licentie overnemen kan
    // auteursrechtelijke problemen geven. Bewust opt-in.
    use_source_image: data.settings?.automation?.use_source_image === true,
  };
}

export function setAutomationSettings({ enabled, max_per_source, auto_publish, auto_publish_min_confidence, auto_gather_sources, auto_update_published, auto_update_min_confidence, use_source_image }) {
  const data = read();
  data.settings = data.settings || {};
  const current = data.settings.automation || {};
  data.settings.automation = {
    enabled: enabled !== undefined ? enabled : (current.enabled ?? true),
    max_per_source: max_per_source !== undefined ? max_per_source : (current.max_per_source ?? 5),
    auto_publish: auto_publish !== undefined ? auto_publish : (current.auto_publish ?? false),
    auto_publish_min_confidence: auto_publish_min_confidence !== undefined ? auto_publish_min_confidence : (current.auto_publish_min_confidence ?? 0.85),
    auto_gather_sources: auto_gather_sources !== undefined ? auto_gather_sources : (current.auto_gather_sources ?? true),
    auto_update_published: auto_update_published !== undefined ? auto_update_published : (current.auto_update_published ?? false),
    auto_update_min_confidence: auto_update_min_confidence !== undefined ? auto_update_min_confidence : (current.auto_update_min_confidence ?? 0.85),
    use_source_image: use_source_image !== undefined ? use_source_image : (current.use_source_image ?? false),
  };
  write(data);
}

export function getNewsletterSettings() {
  const data = read();
  return {
    enabled: Boolean(data.settings?.newsletter?.sender_email),
    sender_email: data.settings?.newsletter?.sender_email || null,
  };
}

export function setNewsletterSettings({ sender_email }) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.newsletter = { sender_email: sender_email || null };
  write(data);
}

export function addNewsletterSubscriber(email) {
  const data = read();
  data.newsletter_subscribers = data.newsletter_subscribers || [];
  if (!data.newsletter_subscribers.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    data.newsletter_subscribers.push({ email, subscribed_at: new Date().toISOString() });
    write(data);
  }
  return data.newsletter_subscribers.length;
}

export function getNewsletterSubscribers() {
  const data = read();
  return data.newsletter_subscribers || [];
}

export function getSocialLinks() {
  const data = read();
  return {
    twitter: data.settings?.social_links?.twitter || null,
    facebook: data.settings?.social_links?.facebook || null,
    instagram: data.settings?.social_links?.instagram || null,
    youtube: data.settings?.social_links?.youtube || null,
  };
}

export function setSocialLinks(links) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.social_links = {
    twitter: links.twitter || null,
    facebook: links.facebook || null,
    instagram: links.instagram || null,
    youtube: links.youtube || null,
  };
  write(data);
}

// "Trending onderwerpen": rangschikt tags op basis van hoeveel weergaven de
// artikelen met die tag de afgelopen periode hebben gehad — dus echte data,
// geen verzonnen trendlijn.
export function getTrendingTags({ days = 7, limit = 5 } = {}) {
  const data = read();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const tagViews = {};
  const tagArticleIds = {};
  for (const a of data.articles) {
    if (a.status !== "published") continue;
    if (!a.published_at || new Date(a.published_at).getTime() < cutoff) continue;
    for (const tag of a.tags || []) {
      tagViews[tag] = (tagViews[tag] || 0) + (a.views || 0);
      tagArticleIds[tag] = tagArticleIds[tag] || [];
      tagArticleIds[tag].push(a.id);
    }
  }

  const topTags = Object.entries(tagViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);

  // Voor elke trending tag de echte dagelijkse weergaven van de laatste
  // `days` dagen optellen — dit voedt de sparkline-grafiek, dus bewust
  // gebaseerd op data die we al bijhouden (article_views_by_day), niet op
  // verzonnen/geschatte cijfers.
  const byDay = data.article_views_by_day || {};
  return topTags.map((tag) => {
    const sparkline = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const dayTotals = byDay[dayKey] || {};
      const dayTotal = (tagArticleIds[tag] || []).reduce((sum, id) => sum + (dayTotals[id] || 0), 0);
      sparkline.push(dayTotal);
    }
    return { tag, views: tagViews[tag], sparkline };
  });
}

const DEFAULT_INFO_CONTENT = {
  about: {
    title: "Over ons",
    body: `<p>Wordt automatisch ingevuld met de sitenaam bij het eerste gebruik — bewerk deze tekst hieronder om 'm helemaal naar wens te maken.</p>
<h2>Hoe onze artikelen tot stand komen</h2>
<p>Onze redactie voert brontekst uit officiële bronnen (zoals persbureaus en officiële instanties) in bij een AI-systeem, dat op basis daarvan een concept-artikel schrijft. Dat concept wordt automatisch gecontroleerd op feiten die niet in de brontekst voorkomen, en gaat pas online nadat een redacteur het heeft beoordeeld en goedgekeurd.</p>
<h2>Contact</h2>
<p>Vragen, correcties of tips? [Vul hier je contact-e-mailadres of contactformulier in.]</p>`,
  },
  privacy: {
    title: "Privacyverklaring",
    body: `<p>Deze privacyverklaring legt uit welke gegevens we verzamelen van bezoekers, en waarom.</p>
<h2>Wie is verantwoordelijk</h2>
<p>[Vul hier de naam van de verantwoordelijke, het correspondentieadres en eventueel KVK-nummer in.]</p>
<h2>Welke gegevens we verzamelen</h2>
<p><strong>Paginaweergaven</strong> — geanonimiseerd bijgehouden, geen IP-adres of ander persoonsgegeven.</p>
<p><strong>Stemmen op polls</strong> — een functioneel cookie om dubbel stemmen te voorkomen.</p>
<p><strong>Nieuwsbrief-aanmelding</strong> — je e-mailadres, alleen als je je vrijwillig aanmeldt.</p>
<h2>Jouw rechten</h2>
<p>Je hebt het recht om te weten welke gegevens we van je hebben, deze te laten corrigeren of verwijderen. Neem hiervoor contact op via [contactgegevens invullen].</p>`,
  },
};

export function getInfoPageContent(slug) {
  const data = read();
  return data.settings?.info_pages_content?.[slug] || DEFAULT_INFO_CONTENT[slug];
}

export function setInfoPageContent(slug, { title, body }) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.info_pages_content = data.settings.info_pages_content || {};
  data.settings.info_pages_content[slug] = { title, body };
  write(data);
}

export function getInfoPagesSettings() {
  const data = read();
  return {
    about_enabled: data.settings?.info_pages?.about_enabled !== false, // standaard aan
    privacy_enabled: data.settings?.info_pages?.privacy_enabled !== false, // standaard aan
  };
}

export function setInfoPagesSettings({ about_enabled, privacy_enabled }) {
  const data = read();
  data.settings = data.settings || {};
  const current = data.settings.info_pages || {};
  data.settings.info_pages = {
    about_enabled: about_enabled !== undefined ? about_enabled : (current.about_enabled ?? true),
    privacy_enabled: privacy_enabled !== undefined ? privacy_enabled : (current.privacy_enabled ?? true),
  };
  write(data);
}

export function getSiteSettings() {
  const data = read();
  return {
    site_name: data.settings?.site?.site_name || "Dagblad",
    site_description: data.settings?.site?.site_description ||
      "Actueel Nederlands nieuws over binnenland, economie, sport en tech — samengesteld met AI en gecontroleerd door de redactie.",
    favicon_url: data.settings?.site?.favicon_url || null,
  };
}

export function setSiteSettings({ site_name, site_description, favicon_url }) {
  const data = read();
  data.settings = data.settings || {};
  const current = data.settings.site || {};
  data.settings.site = {
    site_name: site_name !== undefined ? site_name : current.site_name,
    site_description: site_description !== undefined ? site_description : current.site_description,
    favicon_url: favicon_url !== undefined ? favicon_url : current.favicon_url,
  };
  write(data);
}

const DEFAULT_CATEGORIES = [
  { name: "Binnenland", color: "#0c447c" },
  { name: "Economie", color: "#8a6209" },
  { name: "Sport", color: "#1f7a34" },
  { name: "Tech", color: "#6b3fa0" },
  { name: "Overig", color: "#5f5e5a" },
];

export function getCategories() {
  const data = read();
  return data.settings?.categories?.length ? data.settings.categories : DEFAULT_CATEGORIES;
}

export function setCategories(categories) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.categories = categories;
  write(data);
}

export function getAdsenseClientId() {
  const data = read();
  return data.settings?.adsense_client_id || null;
}

// Losse bannerslots voor een netwerk als Adsterra (of vergelijkbaar) —
// naast AdSense, op specifieke, bewust rustig gekozen plekken op de
// publieke site. Alles hier is optioneel; een lege/niet-ingestelde slot
// toont gewoon niets.
export function getAdSlots() {
  const data = read();
  return {
    social_bar_url: data.settings?.ad_slots?.social_bar_url || null,
    native_banner: data.settings?.ad_slots?.native_banner || null, // { script_url, container_id }
    adsense_slot: data.settings?.ad_slots?.adsense_slot || null, // AdSense data-ad-slot van een grote, responsive eenheid
    banners: {
      top_banner: data.settings?.ad_slots?.banners?.top_banner || null,
      homepage_sidebar: data.settings?.ad_slots?.banners?.homepage_sidebar || null,
      article_sidebar: data.settings?.ad_slots?.banners?.article_sidebar || null,
      article_incontent: data.settings?.ad_slots?.banners?.article_incontent || null,
    },
  };
}

export function setAdSlots(slots) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.ad_slots = slots;
  write(data);
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
export function titleSimilarity(a, b) {
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

// Voor de automatische pijplijn: zoekt een BESTAAND artikel (wachtend op
// review, of al gepubliceerd) dat waarschijnlijk over hetzelfde onderwerp
// gaat als een binnenkomend RSS-item — zodat nieuwe bronnen automatisch
// samengevoegd kunnen worden i.p.v. dat er een los duplicaat-artikel
// ontstaat. Bewust beperkt tot recente artikelen (een RSS-item dat "lijkt"
// op iets van drie weken geleden is vrijwel zeker toeval, geen actueel
// vervolg op hetzelfde nieuws).
export function findRelatedArticle(title, { withinHours = 48, statuses = ["pending_review", "published"] } = {}) {
  const data = read();
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  let best = null;
  for (const a of data.articles) {
    if (!statuses.includes(a.status)) continue;
    const referenceDate = a.published_at || a.created_at;
    if (!referenceDate || new Date(referenceDate).getTime() < cutoff) continue;
    const score = titleSimilarity(title, a.title);
    if (score >= 0.6 && (!best || score > best.score)) {
      best = { id: a.id, status: a.status, score: Math.round(score * 100) };
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
