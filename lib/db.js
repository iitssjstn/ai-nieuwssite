import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// In-memory cache van het volledige databestand. Zonder deze cache wordt
// het bestand bij ÉLKE aanroep van read() opnieuw van schijf gelezen en
// geparsed — en een enkele paginaweergave roept al snel 5-10 verschillende
// functies aan die elk zelf read() aanroepen. Naarmate het bestand groeit
// (meer artikelen), wordt die herhaalde kosten steeds merkbaarder — precies
// het "de site wordt steeds zwaarder"-effect.
//
// Belangrijk: de RSS-scheduler (scripts/rss-scheduler.mjs) draait als een
// volledig LOSSTAAND proces naast de hoofdserver (zie docker-entrypoint.sh)
// — die twee processen delen dus GEEN JavaScript-geheugen. Zou deze cache
// zich alleen baseren op "hebben we al eens gelezen", dan zou de hoofdserver
// nooit meer merken dat de scheduler iets nieuws heeft weggeschreven, tot de
// volgende herstart. Daarom checken we bij elke read() eerst goedkoop (via
// fs.statSync, geen volledige inhoud) of het bestand sinds onze laatste
// cache-vulling gewijzigd is — is dat zo, dan lezen we alsnog opnieuw in.
// Dat kost iets, maar veel minder dan de volledige read+parse die we
// daarmee de rest van de tijd overslaan.
let cache = null;
let cacheMtimeMs = 0;
// Afgeleide cache: alle artikelen ZONDER 'revisions' (oude titel/body-
// snapshots, tot 20 per artikel — puur voor het admin-revisiescherm,
// zie readArticlesLight() bij getArticles() hieronder voor de reden).
let lightArticlesCache = null;

function ensureCacheFresh() {
  const stat = fs.statSync(DB_PATH);
  if (cache === null || stat.mtimeMs !== cacheMtimeMs) {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    cache = JSON.parse(raw);
    cacheMtimeMs = stat.mtimeMs;
    lightArticlesCache = null; // ongeldig zodra het bestand zelf wijzigt
  }
}

function read() {
  ensureCacheFresh();
  return structuredClone(cache);
}

// Voor read-only functies die uitsluitend iets uit data.settings nodig
// hebben (nooit data.articles) — kloont alleen dat kleine deel i.p.v. de
// hele database incl. alle artikelen. Bewust dezelfde vorm als read()
// ({ settings: ... }), zodat bestaande aanroepen als `data.settings?.foo`
// ongewijzigd blijven werken; alleen `read()` vervangen door deze functie.
// NOOIT gebruiken in een functie die ook write(data) aanroept — die heeft
// de VOLLEDIGE data nodig, anders verdwijnen artikelen/sources/etc. bij
// het wegschrijven.
function readSettingsOnly() {
  ensureCacheFresh();
  return { settings: structuredClone(cache.settings || {}) };
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  cache = data;
  cacheMtimeMs = fs.statSync(DB_PATH).mtimeMs;
  lightArticlesCache = null;
}

// Geeft "vandaag" (of een andere datum) terug als YYYY-MM-DD, in de
// Nederlandse tijdzone — bewust NIET gewoon toISOString().slice(0,10),
// want dat gebruikt altijd UTC. Op een VPS die op UTC draait zou "vandaag"
// dan 1-2 uur te laat wisselen (afhankelijk van winter-/zomertijd), precies
// hetzelfde probleem dat we eerder al bij de datumregel op de homepage
// tegenkwamen.
export function getLocalDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(date);
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
  // Draait de opschoon-logica rechtstreeks tegen de levende cache i.p.v.
  // eerst het hele bestand (incl. revisions) te klonen om vervolgens te
  // controleren of er iets te wijzigen valt — scheelt een volledige onnodige
  // clone in verreweg de meeste aanroepen, waarin er niets te backfillen valt.
  ensureCacheFresh();
  let changed = backfillSlugs(cache);
  if (promoteScheduledArticles(cache)) changed = true;
  if (changed) write(cache);

  if (lightArticlesCache === null) {
    // 'revisions' bevat volledige oude titel/body-snapshots (tot 20 per
    // artikel) en wordt uitsluitend gelezen door het admin-revisiescherm
    // (app/review/[id]/page.js), via de LOSSE getArticle()/
    // getArticleBySlug() — nooit via deze lijstfunctie. Op een realistische
    // dataset van ~870 artikelen is dat goed voor zo'n 70% van de totale
    // kloonkosten van elke paginaweergave (homepage, categorieën, header
    // roept dit alleen al 1x aan om het "breaking"-artikel te vinden).
    lightArticlesCache = cache.articles.map(({ revisions, ...rest }) => rest);
  }
  const articles = structuredClone(lightArticlesCache);
  if (status) return articles.filter((a) => a.status === status);
  return articles;
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

  const day = getLocalDateKey();
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
    const key = getLocalDateKey(d);
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
    // null = gebruikt het globale interval uit Instellingen → RSS-schema.
    // Alleen ingevuld als deze bron een eigen, afwijkend schema heeft.
    poll_interval_minutes: null,
    last_polled_at: null,
    ...source,
  };
  data.sources.push(newSource);
  write(data);
  return newSource;
}

export function updateSource(id, updates) {
  const data = read();
  const src = data.sources.find((s) => s.id === id);
  if (!src) return null;
  Object.assign(src, updates);
  write(data);
  return src;
}

// Aparte, lichte functie specifiek voor het bijwerken van 'wanneer voor het
// laatst gepolld' — wordt vaak aangeroepen (elke minuut door de scheduler
// voor elke bron die aan de beurt was), dus geen reden om de generieke
// updateSource() met zijn bredere Object.assign-gedrag hiervoor te belasten.
export function markSourcePolled(id) {
  const data = read();
  const src = data.sources.find((s) => s.id === id);
  if (!src) return;
  src.last_polled_at = new Date().toISOString();
  write(data);
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
  const data = readSettingsOnly();
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
  const data = readSettingsOnly();
  return data.settings?.image_providers?.[providerId] || null;
}

// Aangepaste providers die de admin zelf toevoegt (naast de ingebouwde
// Pexels/Unsplash/Pixabay) — bevat alleen de SCHEMA (URL-sjabloon,
// authenticatiewijze, veldmappings), niet de API-key zelf. De key wordt
// via de bestaande getImageProviderConfig/setImageProviderConfig-functies
// hierboven opgeslagen, op basis van hetzelfde providerId.
export function getCustomImageProviders() {
  const data = readSettingsOnly();
  return data.settings?.custom_image_providers || [];
}

// Aangepaste AI-tekstgeneratie-providers die de admin zelf toevoegt naast de
// vijf ingebouwde (Gemini, Groq, OpenRouter, Cerebras, Mistral) — bedoeld
// om snel een nieuwe, OpenAI-compatibele provider te kunnen uitproberen
// zonder daarvoor een code-wijziging/herbouw nodig te hebben. Bevat alleen
// het SCHEMA (naam, base-URL, standaardmodel), niet de API-key zelf — die
// wordt via de bestaande getProviderConfig/setProviderConfig hieronder
// opgeslagen, op basis van hetzelfde id (zelfde patroon als hierboven bij
// custom image providers).
export function getCustomAiProviders() {
  const data = readSettingsOnly();
  return data.settings?.custom_ai_providers || [];
}

export function setCustomAiProviders(providers) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.custom_ai_providers = providers;
  write(data);
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

// "Hartslag" van het losstaande RSS-scheduler-achtergrondproces
// (scripts/rss-scheduler.mjs) — bij elke voltooide tick bijgewerkt, ook als
// er niets te doen was. Zo is in het adminpaneel te zien of dat proces
// daadwerkelijk nog draait, in plaats van dat alleen achteraf op te merken
// aan een gebrek aan nieuwe artikelen. Puur informatief, geen enkele
// functionaliteit hangt hiervan af.
export function updateSchedulerHeartbeat() {
  const data = read();
  data.settings = data.settings || {};
  data.settings.scheduler_heartbeat = new Date().toISOString();
  write(data);
}

export function getSchedulerHeartbeat() {
  const data = readSettingsOnly();
  return data.settings?.scheduler_heartbeat || null;
}

export function getAutomationSettings() {
  const data = readSettingsOnly();
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
    // Hoe vaak de scheduler nieuwe RSS-items ophaalt. Was voorheen alleen
    // via de RSS_POLL_INTERVAL_MINUTES-environment-variabele in te stellen
    // (dus alleen aanpasbaar met een herdeploy) — nu direct in dit scherm.
    poll_interval_minutes: data.settings?.automation?.poll_interval_minutes ?? 30,
    // Optioneel tijdvenster waarbinnen de scheduler mag draaien (bijv. niet
    // 's nachts). Ondersteunt ook een venster dat over middernacht heen
    // loopt (bijv. 22:00 tot 06:00).
    active_hours_enabled: data.settings?.automation?.active_hours_enabled === true,
    active_hours_start: data.settings?.automation?.active_hours_start ?? "07:00",
    active_hours_end: data.settings?.automation?.active_hours_end ?? "23:00",
    // Hoe vaak (in uren) het databestand automatisch wordt geback-upt.
    backup_frequency_hours: data.settings?.automation?.backup_frequency_hours ?? 24,
    // Probeer bij het genereren eerst de snelste geconfigureerde gratis
    // provider (Groq) i.p.v. altijd eerst Gemini — standaard UIT, want de
    // huidige volgorde (Gemini eerst) is bewust zo gekozen vanwege
    // kwaliteit; dit is een aparte, expliciete keuze voor snelheid.
    prioritize_speed: data.settings?.automation?.prioritize_speed === true,
    // Extra AI-controlestap ná het genereren: laat een AI het concept
    // tegen de brontekst aanhouden en feitelijke problemen markeren, vóór
    // het bij de menselijke redacteur in de wachtrij komt — kost een
    // volledige extra AI-aanroep (dus meer tijd en gratis quota-verbruik)
    // per artikel. Standaard UIT, bewust opt-in.
    verification_pass_enabled: data.settings?.automation?.verification_pass_enabled === true,
    // Minimum aantal woorden voor de body van een nieuw gegenereerd
    // artikel — wordt zowel in de AI-prompt als instructie meegegeven als,
    // indien de eerste poging er toch onder blijft, gebruikt om
    // automatisch één aanvul-poging te doen (zie expandDraftIfTooShort in
    // lib/ai.js). Standaard 300 — onder de beoogde 350-500 woorden, maar
    // ruim boven wat als "duidelijk te kort" geldt.
    min_word_count: data.settings?.automation?.min_word_count ?? 300,
  };
}

export function setAutomationSettings({
  enabled, max_per_source, auto_publish, auto_publish_min_confidence, auto_gather_sources,
  auto_update_published, auto_update_min_confidence, use_source_image,
  poll_interval_minutes, active_hours_enabled, active_hours_start, active_hours_end,
  backup_frequency_hours, prioritize_speed, verification_pass_enabled, min_word_count,
}) {
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
    poll_interval_minutes: poll_interval_minutes !== undefined ? poll_interval_minutes : (current.poll_interval_minutes ?? 30),
    active_hours_enabled: active_hours_enabled !== undefined ? active_hours_enabled : (current.active_hours_enabled ?? false),
    active_hours_start: active_hours_start !== undefined ? active_hours_start : (current.active_hours_start ?? "07:00"),
    active_hours_end: active_hours_end !== undefined ? active_hours_end : (current.active_hours_end ?? "23:00"),
    backup_frequency_hours: backup_frequency_hours !== undefined ? backup_frequency_hours : (current.backup_frequency_hours ?? 24),
    prioritize_speed: prioritize_speed !== undefined ? prioritize_speed : (current.prioritize_speed ?? false),
    verification_pass_enabled: verification_pass_enabled !== undefined ? verification_pass_enabled : (current.verification_pass_enabled ?? false),
    min_word_count: min_word_count !== undefined ? min_word_count : (current.min_word_count ?? 300),
  };
  write(data);
}

// Checks whether the current moment (in the configured timezone) falls
// within the set active-hours window. Also supports a window that spans
// midnight (e.g. start "22:00", end "06:00").
export function isWithinActiveHours({ active_hours_enabled, active_hours_start, active_hours_end }) {
  if (!active_hours_enabled) return true;
  const nowStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date());
  const [nowH, nowM] = nowStr.split(":").map(Number);
  const nowMinutes = nowH * 60 + nowM;
  const [startH, startM] = active_hours_start.split(":").map(Number);
  const [endH, endM] = active_hours_end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Venster loopt over middernacht heen (bijv. 22:00 -> 06:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

// Instellingen voor het automatisch wegsturen van elke nieuwe back-up naar
// een tweede, losstaande server (via de aparte back-up-ontvanger-applicatie)
// — zodat back-ups niet alleen op deze server staan.
export function getRemoteBackupSettings() {
  const data = readSettingsOnly();
  return {
    url: data.settings?.remote_backup?.url || null,
    key: data.settings?.remote_backup?.key || null,
  };
}

export function setRemoteBackupSettings({ url, key }) {
  const data = read();
  data.settings = data.settings || {};
  const current = data.settings.remote_backup || {};
  data.settings.remote_backup = {
    url: url !== undefined ? url : (current.url || null),
    key: key !== undefined ? key : (current.key || null),
  };
  write(data);
}

export function getNewsletterSettings() {
  const data = readSettingsOnly();
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
  const data = readSettingsOnly();
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
      const dayKey = getLocalDateKey(d);
      const dayTotals = byDay[dayKey] || {};
      const dayTotal = (tagArticleIds[tag] || []).reduce((sum, id) => sum + (dayTotals[id] || 0), 0);
      sparkline.push(dayTotal);
    }
    return { tag, views: tagViews[tag], sparkline };
  });
}

const DEFAULT_INFO_CONTENT = {
  about: {
    title: "About Us",
    body: `<p>Automatically filled in with the site name on first use — edit this text below to make it entirely your own.</p>
<h2>How our articles come about</h2>
<p>Our editorial team feeds source text from official sources (such as press agencies and official bodies) into an AI system, which writes a draft article based on it. That draft is automatically checked for facts that don't appear in the source text, and only goes live after a human editor has reviewed and approved it.</p>
<h2>Contact</h2>
<p>Questions, corrections, or tips? [Fill in your contact email address or contact form here.]</p>`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `<p>This privacy policy explains what data we collect from visitors, and why.</p>
<h2>Who is responsible</h2>
<p>[Fill in the name of the responsible party, correspondence address, and business registration number if applicable.]</p>
<h2>What data we collect</h2>
<p><strong>Page views</strong> — tracked anonymously, no IP address or other personal data.</p>
<p><strong>Poll votes</strong> — a functional cookie to prevent double voting.</p>
<p><strong>Newsletter signup</strong> — your email address, only if you voluntarily sign up.</p>
<h2>Cookies</h2>
<p>We don't place any tracking or marketing cookies ourselves. The only cookie we set ourselves is the functional voting cookie mentioned above.</p>
<p><strong>Advertising:</strong> if you give consent via the cookie notice on the site, ad networks (such as Google AdSense) may place their own cookies to display ads. If you don't give consent, these scripts won't load.</p>
<h2>Your rights</h2>
<p>You have the right to know what data we hold about you, and to have it corrected or deleted. Please contact us via [fill in contact details].</p>`,
  },
};

export function getInfoPageContent(slug) {
  const data = readSettingsOnly();
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
  const data = readSettingsOnly();
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
  const data = readSettingsOnly();
  return {
    site_name: data.settings?.site?.site_name || "Daily News",
    site_description: data.settings?.site?.site_description ||
      "Breaking news on national affairs, business, sports, and tech — compiled with AI and reviewed by the editorial team.",
    favicon_url: data.settings?.site?.favicon_url || null,
    google_site_verification: data.settings?.site?.google_site_verification || null,
    bing_site_verification: data.settings?.site?.bing_site_verification || null,
    // Alleen of de sleutel gezet is wordt teruggegeven, nooit de sleutel
    // zelf — zelfde reden als bij remote-backup's wachtwoord: een API-sleutel
    // hoort nooit terug te komen naar de browser nadat hij is opgeslagen.
    has_bing_webmaster_api_key: Boolean(data.settings?.site?.bing_webmaster_api_key),
    // De publieke URL van de site zelf (bijv. "https://novapers.nl"), NIET
    // af te leiden uit het inkomende request — een publicatie-actie loopt
    // vaak via admin.novapers.nl, en de achtergrond-RSS-planner
    // (scripts/rss-scheduler.mjs) heeft sowieso helemaal geen request om
    // een host uit te lezen. Alleen gebruikt om IndexNow/Bing te pingen
    // met de juiste, publieke artikel-URL.
    site_url: data.settings?.site?.site_url || null,
  };
}

// Voor intern gebruik (het daadwerkelijk aanroepen van Bing's API) — anders
// dan getSiteSettings() hierboven geeft dit de sleutel wél terug, dus dit
// mag nooit rechtstreeks aan een API-response worden doorgegeven.
export function getBingWebmasterApiKey() {
  const data = readSettingsOnly();
  return data.settings?.site?.bing_webmaster_api_key || null;
}

// IndexNow (ondersteund door Bing, Yandex en Seznam — Google gebruikt dit
// protocol niet rechtstreeks) vereist een vaste, geheime sleutel die zowel
// in elke ping als in een statisch bestand op de site zelf staat, zodat de
// zoekmachine kan verifiëren dat de ping echt van de sitebeheerder komt.
// Wordt bij eerste gebruik lazy aangemaakt en daarna hergebruikt.
export function getIndexNowKey() {
  const data = read();
  const existing = data.settings?.site?.indexnow_key;
  if (existing) return existing;

  const key = crypto.randomBytes(16).toString("hex");
  data.settings = data.settings || {};
  data.settings.site = { ...(data.settings.site || {}), indexnow_key: key };
  write(data);
  return key;
}

export function setSiteSettings({ site_name, site_description, favicon_url, google_site_verification, bing_site_verification, bing_webmaster_api_key, site_url }) {
  const data = read();
  data.settings = data.settings || {};
  const current = data.settings.site || {};
  data.settings.site = {
    ...current, // behoudt o.a. indexnow_key, die hier niet ingesteld wordt
    site_name: site_name !== undefined ? site_name : current.site_name,
    site_description: site_description !== undefined ? site_description : current.site_description,
    favicon_url: favicon_url !== undefined ? favicon_url : current.favicon_url,
    google_site_verification: google_site_verification !== undefined ? google_site_verification : current.google_site_verification,
    bing_site_verification: bing_site_verification !== undefined ? bing_site_verification : current.bing_site_verification,
    bing_webmaster_api_key: bing_webmaster_api_key !== undefined ? bing_webmaster_api_key : current.bing_webmaster_api_key,
    site_url: site_url !== undefined ? site_url : current.site_url,
  };
  write(data);
}

const DEFAULT_CATEGORIES = [
  { name: "National", color: "#0c447c" },
  { name: "World", color: "#0c447c" },
  { name: "Business", color: "#8a6209" },
  { name: "Sports", color: "#1f7a34" },
  { name: "Tech", color: "#6b3fa0" },
  { name: "Other", color: "#5f5e5a" },
];

export function getCategories() {
  const data = readSettingsOnly();
  return data.settings?.categories?.length ? data.settings.categories : DEFAULT_CATEGORIES;
}

// Bij een expliciete hernoeming (rename: {from, to}) worden ook alle
// artikelen met die oude categorienaam in één atomaire schrijfactie
// meegenomen — anders zouden bestaande artikelen hun categorie-koppeling
// verliezen zodra de naam in de lijst verandert. Bewust een expliciete
// rename-parameter i.p.v. proberen te "raden" op basis van array-verschil:
// dat laatste is foutgevoelig zodra categorieën ook verplaatst worden.
export function setCategories(categories, rename) {
  const data = read();
  data.settings = data.settings || {};

  let finalCategories = categories;
  // Een hernoeming van een hoofdcategorie moet ook doorwerken in het
  // 'parent'-veld van zijn subcategorieën — anders wijzen die na het
  // opslaan naar een naam die niet meer bestaat.
  if (rename && rename.from && rename.to && rename.from !== rename.to) {
    finalCategories = finalCategories.map((c) =>
      c.parent === rename.from ? { ...c, parent: rename.to } : c
    );
  }
  // Defensief: als een subcategorie verwijst naar een parent die niet (meer)
  // in de lijst voorkomt (bijv. de hoofdcategorie is net verwijderd), wordt
  // hij automatisch een gewone hoofdcategorie i.p.v. een "kapotte" koppeling
  // te laten bestaan.
  const names = new Set(finalCategories.map((c) => c.name));
  finalCategories = finalCategories.map((c) =>
    c.parent && !names.has(c.parent) ? { ...c, parent: null } : c
  );

  data.settings.categories = finalCategories;
  let articlesUpdated = 0;
  if (rename && rename.from && rename.to && rename.from !== rename.to) {
    for (const article of data.articles) {
      if (article.category === rename.from) {
        article.category = rename.to;
        articlesUpdated++;
      }
    }
  }
  write(data);
  return articlesUpdated;
}

export function getAdsenseClientId() {
  const data = readSettingsOnly();
  return data.settings?.adsense_client_id || null;
}

// Ezoic doesn't require a site-specific ID in the script itself — the
// connection happens via domain verification in their own dashboard.
// So this is just a simple on/off toggle.
export function getEzoicEnabled() {
  const data = readSettingsOnly();
  return data.settings?.ezoic_enabled === true;
}

export function setEzoicEnabled(enabled) {
  const data = read();
  data.settings = data.settings || {};
  data.settings.ezoic_enabled = enabled === true;
  write(data);
}

// Losse bannerslots voor een netwerk als Adsterra (of vergelijkbaar) —
// naast AdSense, op specifieke, bewust rustig gekozen plekken op de
// publieke site. Alles hier is optioneel; een lege/niet-ingestelde slot
// toont gewoon niets.
export function getAdSlots() {
  const data = readSettingsOnly();
  return {
    social_bar_url: data.settings?.ad_slots?.social_bar_url || null,
    native_banner: data.settings?.ad_slots?.native_banner || null, // { script_url, container_id }
    adsense_slot: data.settings?.ad_slots?.adsense_slot || null, // AdSense data-ad-slot for a large, responsive unit
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

// Eigen advertentie-aanmeldingen (het "Ad Center"): externe adverteerders
// melden zelf een banner aan voor een specifieke plek, de beheerder keurt
// die goed/af, en een goedgekeurde advertentie verschijnt direct op de
// site — zie AdSlot.js voor de weergavekant.
export function getAdSubmissions({ status } = {}) {
  const data = read();
  const subs = data.ad_submissions || [];
  if (status) return subs.filter((s) => s.status === status);
  return subs;
}

export function createAdSubmission(sub) {
  const data = read();
  data.ad_submissions = data.ad_submissions || [];
  const newSub = {
    id: "ad-" + crypto.randomUUID(),
    status: "pending",
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    ...sub,
  };
  data.ad_submissions.push(newSub);
  write(data);
  return newSub;
}

// Twee datumbereiken overlappen zodra het ene niet volledig vóór of ná het
// andere ligt. Een ontbrekende (null) startdatum betekent "loopt al vanaf
// het begin", een ontbrekende einddatum betekent "loopt vooralsnog
// onbepaalde tijd door" — allebei tellen dus mee als "raakt in principe
// alles" aan die kant van de vergelijking.
function dateRangesOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = aStart ? new Date(aStart).getTime() : -Infinity;
  const aE = aEnd ? new Date(aEnd).getTime() : Infinity;
  const bS = bStart ? new Date(bStart).getTime() : -Infinity;
  const bE = bEnd ? new Date(bEnd).getTime() : Infinity;
  return aS <= bE && bS <= aE;
}

export function updateAdSubmission(id, updates) {
  const data = read();
  data.ad_submissions = data.ad_submissions || [];
  const sub = data.ad_submissions.find((s) => s.id === id);
  if (!sub) return null;

  // Bij het (opnieuw) inplannen van een goedgekeurde advertentie: nooit
  // stilzwijgend een andere advertentie op dezelfde plek overschrijven.
  // In plaats daarvan controleren of de nieuwe periode overlapt met een
  // ANDERE al goedgekeurde advertentie op dezelfde plek, en zo ja, de
  // wijziging COMPLEET weigeren met een duidelijke reden — dat is precies
  // wat het mogelijk maakt om van tevoren advertenties vóór/na elkaar in
  // te plannen zonder zelf te hoeven controleren of iets overlapt.
  if (updates.status === "approved" || (sub.status === "approved" && (updates.start_date !== undefined || updates.end_date !== undefined))) {
    const newStart = updates.start_date !== undefined ? updates.start_date : sub.start_date;
    const newEnd = updates.end_date !== undefined ? updates.end_date : sub.end_date;
    const conflict = data.ad_submissions.find(
      (other) =>
        other.id !== id &&
        other.slot === sub.slot &&
        other.status === "approved" &&
        dateRangesOverlap(newStart, newEnd, other.start_date, other.end_date)
    );
    if (conflict) {
      const err = new Error(
        `Overlaps with an already-scheduled ad from "${conflict.advertiser_name}" for this same placement ` +
          `(${conflict.start_date || "no start date"} to ${conflict.end_date || "indefinite"}).`
      );
      err.isConflict = true;
      throw err;
    }
  }

  Object.assign(sub, updates, { reviewed_at: new Date().toISOString() });
  write(data);
  return sub;
}

export function deleteAdSubmission(id) {
  const data = read();
  const list = data.ad_submissions || [];
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  write(data);
  return true;
}

// Lichte, read-only variant specifiek voor de publieke weergavekant
// (AdSlot.js) — die wordt op elke paginaweergave aangeroepen voor elke
// advertentieplek op die pagina, dus bewust geen volledige clone van de
// hele database (inclusief alle artikelen) nodig, zelfde patroon als
// readSettingsOnly() hierboven.
export function getActiveAdForSlot(slotName) {
  ensureCacheFresh();
  const now = Date.now();
  // Onder de goedgekeurde advertenties voor deze plek: degene wiens
  // periode vandaag daadwerkelijk omvat — een ontbrekende startdatum
  // betekent "loopt al", een ontbrekende einddatum betekent "loopt nog
  // door". Bij correcte planning (zie updateAdSubmission's overlap-check)
  // matcht hier nooit meer dan één advertentie tegelijk.
  const sub = (cache.ad_submissions || []).find((s) => {
    if (s.slot !== slotName || s.status !== "approved") return false;
    const start = s.start_date ? new Date(s.start_date).getTime() : -Infinity;
    const end = s.end_date ? new Date(s.end_date).getTime() : Infinity;
    return start <= now && now <= end;
  });
  return sub ? structuredClone(sub) : null;
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
  // Nooit de hash of het rauwe uitnodigingstoken teruggeven in de lijst —
  // wie dat token heeft, kan het wachtwoord van dat account instellen. De
  // admin krijgt het token alleen los, direct na het aanmaken/opnieuw
  // genereren van een uitnodiging (zie createInvite/regenerateInviteLink).
  return data.users.map(({ password_hash, invite_token, ...rest }) => ({
    ...rest,
    has_pending_invite: Boolean(invite_token),
  }));
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

export function createUser({ username, password_hash, role, full_name, email, phone, address, invite_token, invite_expires_at }) {
  const data = read();
  migrateUsersIfNeeded(data);
  if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Deze gebruikersnaam bestaat al.");
  }
  const user = {
    id: crypto.randomUUID(),
    username,
    password_hash: password_hash || null,
    role: role === "admin" ? "admin" : "editor",
    full_name: full_name || null,
    email: email || null,
    phone: phone || null,
    address: address || null,
    last_active: null,
    created_at: new Date().toISOString(),
    invite_token: invite_token || null,
    invite_expires_at: invite_expires_at || null,
  };
  data.users.push(user);
  write(data);
  const { password_hash: _drop, invite_token: _drop2, ...safe } = user;
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
      throw new Error("Cannot demote the last admin to editor.");
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
    throw new Error("Cannot delete the last admin account.");
  }
  data.users.splice(idx, 1);
  write(data);
  return true;
}

// Genereert een nieuw (of vervangend) uitnodigingstoken voor een account,
// geldig 7 dagen. Geeft het RAUWE token terug — dat wordt maar één keer
// getoond, hierna staat alleen het token zelf in de opslag (geen hash nodig
// zoals bij wachtwoorden, want dit token is zelf al eenmalig en tijdelijk).
export function regenerateInviteLink(id) {
  const data = read();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const token = crypto.randomBytes(24).toString("hex");
  data.users[idx].invite_token = token;
  data.users[idx].invite_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  write(data);
  return token;
}

// Zoekt een gebruiker op basis van een (nog geldig) uitnodigingstoken —
// gebruikt door de publieke uitnodigingspagina, dus bewust geen verdere
// authenticatie nodig (het token ZELF is de authenticatie).
export function getUserByInviteToken(token) {
  const data = read();
  const user = data.users.find((u) => u.invite_token === token);
  if (!user) return null;
  if (!user.invite_expires_at || new Date(user.invite_expires_at).getTime() < Date.now()) return null;
  const { password_hash, invite_token, ...safe } = user;
  return safe;
}

// Rondt een uitnodiging af: zet het door de gebruiker zelf gekozen
// wachtwoord, en maakt het token ongeldig (kan maar één keer gebruikt
// worden).
export function completeInvite(token, password_hash) {
  const data = read();
  const idx = data.users.findIndex((u) => u.invite_token === token);
  if (idx === -1) return false;
  if (!data.users[idx].invite_expires_at || new Date(data.users[idx].invite_expires_at).getTime() < Date.now()) return false;
  data.users[idx].password_hash = password_hash;
  data.users[idx].invite_token = null;
  data.users[idx].invite_expires_at = null;
  write(data);
  return true;
}

// Self-service: een ingelogde gebruiker (admin ÓF redacteur) past zijn
// eigen profielgegevens aan. Bewust GEEN role/username-wijziging hier — dat
// blijft voorbehouden aan het admin-only gebruikersbeheer, zodat een
// redacteur zichzelf niet per ongeluk (of expres) tot admin kan maken.
export function updateOwnProfile(id, { full_name, email, phone, address }) {
  const data = read();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  data.users[idx] = {
    ...data.users[idx],
    full_name: full_name !== undefined ? full_name : data.users[idx].full_name,
    email: email !== undefined ? email : data.users[idx].email,
    phone: phone !== undefined ? phone : data.users[idx].phone,
    address: address !== undefined ? address : data.users[idx].address,
  };
  write(data);
  const { password_hash, invite_token, ...safe } = data.users[idx];
  return safe;
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
// Bepaalt hoe "zeldzaam" elk woord is binnen een verzameling titels — hoe
// vaker een woord in de bestaande titels voorkomt, hoe lager het gewicht.
// Zo tellen generieke journalistieke woorden ("kampt", "presenteert",
// "nieuwe") nauwelijks mee bij het bepalen van gelijkenis, terwijl
// onderscheidende woorden (plaatsnamen, specifieke gebeurtenissen, cijfers)
// zwaar wegen — vergelijkbaar met hoe zoekmachines relevantie berekenen
// (TF-IDF-achtig, hier vereenvoudigd tot alleen de IDF-kant).
function computeWordWeights(titles) {
  const docFreq = {};
  const wordSets = titles.map((t) => new Set(t.toLowerCase().split(/\W+/).filter((w) => w.length > 3)));
  for (const set of wordSets) {
    for (const w of set) docFreq[w] = (docFreq[w] || 0) + 1;
  }
  const n = titles.length;
  const weights = {};
  for (const w in docFreq) {
    weights[w] = Math.log((n + 1) / (docFreq[w] + 1)) + 1; // altijd > 0
  }
  return weights;
}

export function titleSimilarity(a, b, weights = {}) {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const weightOf = (w) => weights[w] ?? 1; // onbekend woord = neutraal gewicht
  const overlap = [...wordsA].filter((w) => wordsB.has(w));
  if (overlap.length === 0) return 0;
  // Basis: hetzelfde eenvoudige woord-overlap-percentage als voorheen.
  const baseScore = overlap.length / Math.min(wordsA.size, wordsB.size);
  // Correctiefactor: hoe "zeldzaam" zijn de overlappende woorden, vergeleken
  // met het gemiddelde gewicht van ALLE woorden in dit titel-paar? Bestaat
  // de overlap vooral uit generieke journalistieke taal ("kampt", "nieuwe"),
  // dan is dit gemiddelde laag t.o.v. het totaal, en wordt de score verlaagd.
  // Bestaat de overlap juist uit onderscheidende woorden (plaatsnamen,
  // specifieke gebeurtenissen), dan blijft de score intact.
  const avgOverlapWeight = overlap.reduce((sum, w) => sum + weightOf(w), 0) / overlap.length;
  const allWords = new Set([...wordsA, ...wordsB]);
  const avgAllWeight = [...allWords].reduce((sum, w) => sum + weightOf(w), 0) / allWords.size;
  const distinctiveness = Math.min(1, avgOverlapWeight / avgAllWeight);
  return baseScore * distinctiveness;
}

// Drempel bewust op 0.5 gezet (was 0.6, vóór de introductie van de
// gewogen score hierboven) — met de nieuwe, gewogen berekening liggen de
// scores van "toevallig dezelfde generieke woorden" en "daadwerkelijk
// hetzelfde onderwerp" dichter bij elkaar dan bij de oude, ongewogen
// telling. 0.5 is empirisch getest tegen meerdere scenario's (zie de
// dev-log/testresultaten) als het punt dat beide correct scheidt.
const DUPLICATE_THRESHOLD = 0.5;

export function findPossibleDuplicate(title, excludeId = null) {
  const data = read();
  const candidates = data.articles.filter((a) => a.id !== excludeId && a.status !== "rejected");
  const weights = computeWordWeights([title, ...candidates.map((a) => a.title)]);
  let best = null;
  for (const a of candidates) {
    const score = titleSimilarity(title, a.title, weights);
    if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) {
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
  const candidates = data.articles.filter((a) => {
    if (!statuses.includes(a.status)) return false;
    const referenceDate = a.published_at || a.created_at;
    return referenceDate && new Date(referenceDate).getTime() >= cutoff;
  });
  const weights = computeWordWeights([title, ...candidates.map((a) => a.title)]);
  let best = null;
  for (const a of candidates) {
    const score = titleSimilarity(title, a.title, weights);
    if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) {
      best = { id: a.id, status: a.status, score: Math.round(score * 100) };
    }
  }
  return best;
}

export function incrementPageview() {
  const data = read();
  const day = getLocalDateKey();
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
    const key = getLocalDateKey(d);
    result.push({ date: key, views: data.pageviews?.[key] || 0 });
  }
  return result;
}
