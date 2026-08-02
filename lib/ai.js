import { getProviderConfig } from "./db.js";
import { callGoogle } from "./ai-providers/google.js";
import { callOpenAICompatible } from "./ai-providers/openai-compatible.js";

const SYSTEM_PROMPT = `Je bent een nieuwsredacteur die volledige, uitgebreide nieuwsartikelen schrijft in het Nederlands, uitsluitend op basis van de aangeleverde brontekst.

Regels, zonder uitzondering:
- Schrijf "title" en "body" ALTIJD volledig in het Nederlands — ook als de brontekst zelf in
  een andere taal is (bijv. Engels, Duits, Frans). Vertaal en herschrijf dan zelf naar vloeiend,
  natuurlijk Nederlands; laat nooit losse Engelse (of andere) zinnen, woorden of citaten
  onvertaald staan. Dit is de belangrijkste regel en geldt onder alle omstandigheden.
- Gebruik alleen feiten, cijfers en namen die letterlijk in de brontekst staan. Verzin niets.
- Voeg geen citaten toe die niet woordelijk (of vrijwel woordelijk) in de brontekst voorkomen.
- Als de brontekst iets niet vermeldt, laat het weg — vul aan met duiding, structuur en
  herformulering van wat er al staat, nooit met nieuwe feiten.
- Schrijf neutraal en feitelijk, geen mening of speculatie.
- Schrijf een volledig artikel van minimaal 5 tot 6 alinea's (ruwweg 350-500 woorden), opgebouwd als:
  1. Een sterke openingsalinea die de kern van het nieuws samenvat.
  2. Eén of meer alinea's die de belangrijkste details uitwerken.
  3. Context of achtergrond — alleen als die in de brontekst staat.
  4. Een afrondende alinea met vervolg of implicaties — alleen als de brontekst daar aanleiding voor geeft.
- Is de brontekst zelf kort? Herhaal feiten dan niet letterlijk om lengte te forceren. Werk ze
  uit vanuit verschillende invalshoeken (wat betekent dit, voor wie, wanneer treedt het in
  werking) zolang dat gebaseerd blijft op wat er al staat.
- Gebruik "\\n" tussen alinea's in het "body"-veld, zodat elke alinea apart herkenbaar is.
- Uitzondering op de Nederlands-regel hierboven: bedenk voor "image_keywords" 2 tot 4 ENGELSE
  zoekwoorden die het hoofdonderwerp van het artikel visueel omschrijven, geschikt om een
  passende stockfoto mee te zoeken (bijv. "wildfire firefighters" of "government building
  parliament") — dit veld is de ENIGE plek in je antwoord die in het Engels moet zijn. Focus op
  het onderwerp/de setting, niet op namen van specifieke personen of plaatsen die toch niet als
  stockfoto te vinden zijn.
- Haal ook de 3 tot 5 belangrijkste feitelijke beweringen (cijfers, gebeurtenissen, uitspraken)
  uit je eigen artikel, en geef per bewering aan of die LETTERLIJK terug te vinden is in de
  brontekst ("verified": true) of dat het een parafrase/afleiding is die niet woord-voor-woord
  in de bron staat ("verified": false) — dit is voor de menselijke eindcontrole, dus wees streng.
- Als de brontekst een duidelijke, specifieke plaats noemt waar het nieuws zich afspeelt (een
  stad, dorp, regio of land — geen vage aanduiding), geef die dan mee als "location_hint" (in het
  Nederlands, zo specifiek mogelijk, bijv. "Vaassen, Gelderland" of "Rome, Italië"). Is er geen
  duidelijke locatie, laat "location_hint" dan null.
- Antwoord ALLEEN met geldige JSON, in dit exacte formaat, zonder markdown-codeblok eromheen:
{"title": "...", "body": "...", "category": "Binnenland|Economie|Sport|Tech|Overig", "image_keywords": "...", "claims": [{"text": "...", "verified": true}], "location_hint": "..."}`;

// Providers worden in deze volgorde geprobeerd. Een provider zonder
// ingestelde API-key wordt overgeslagen; faalt een provider (rate limit,
// storing, verlopen model), dan valt het systeem automatisch terug op de
// volgende geconfigureerde provider — vandaar "niet alleen op Gemini leunen".
const PROVIDERS = [
  {
    id: "google",
    label: "Google Gemini",
    defaultModel: "gemini-3.5-flash",
    call: (cfg, systemPrompt, userPrompt) =>
      callGoogle({ apiKey: cfg.api_key, model: cfg.model || "gemini-3.5-flash", systemPrompt, userPrompt }),
  },
  {
    id: "groq",
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "llama-3.3-70b-versatile",
        systemPrompt,
        userPrompt,
      }),
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openrouter/free",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "openrouter/free",
        systemPrompt,
        userPrompt,
      }),
  },
  {
    id: "cerebras",
    label: "Cerebras",
    defaultModel: "llama-3.3-70b",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "llama-3.3-70b",
        systemPrompt,
        userPrompt,
      }),
  },
  {
    id: "mistral",
    label: "Mistral AI",
    defaultModel: "mistral-small-latest",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://api.mistral.ai/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "mistral-small-latest",
        systemPrompt,
        userPrompt,
      }),
  },
];

export { PROVIDERS };

// Generieke helper: probeert elke geconfigureerde provider in volgorde met
// een eigen systeem-/gebruikersprompt, geeft de ruwe tekstrespons terug van
// de eerste die slaagt. Gebruikt door zowel generateDraft als
// generateTitleVariants, zodat de fallback-logica maar op één plek staat.
async function callWithFallback(systemPrompt, userPrompt) {
  const attempted = [];
  for (const provider of PROVIDERS) {
    const cfg = getProviderConfig(provider.id);
    if (!cfg?.api_key) continue;
    try {
      const rawText = await provider.call(cfg, systemPrompt, userPrompt);
      return { rawText, providerLabel: provider.label };
    } catch (err) {
      attempted.push(`${provider.label}: ${err.message}`);
    }
  }
  if (attempted.length === 0) {
    throw new Error("Er is nog geen AI-provider ingesteld. Voeg minstens één API-key toe via Instellingen.");
  }
  throw new Error("Alle geconfigureerde providers faalden — " + attempted.join(" | "));
}

const FACT_CHECK_ADDENDUM = `

Er zijn meerdere bronnen over dit onderwerp aangeleverd. Vergelijk ze:
- Gebruik alleen feiten die door minstens één bron worden genoemd (nog steeds: verzin niets).
- Als bronnen elkaar TEGENSPREKEN op een concreet punt (cijfer, aantal, naam, datum), noem dat
  dan expliciet in een apart veld "consistency_notes" — een korte Nederlandse zin per
  tegenstrijdigheid. Zijn de bronnen het met elkaar eens, laat "consistency_notes" dan een lege
  lijst.
- Antwoord in dit exacte formaat:
{"title": "...", "body": "...", "category": "Binnenland|Economie|Sport|Tech|Overig", "consistency_notes": ["...", ...], "image_keywords": "...", "claims": [{"text": "...", "verified": true}], "location_hint": "..."}`;

export async function generateDraft({ sourceText, sourceName, additionalSources = [] }) {
  const hasMultipleSources = additionalSources.length > 0;
  const systemPrompt = hasMultipleSources ? SYSTEM_PROMPT + FACT_CHECK_ADDENDUM : SYSTEM_PROMPT;

  let userPrompt = `Bron 1 (${sourceName}):\n${sourceText}`;
  additionalSources.forEach((s, i) => {
    userPrompt += `\n\nBron ${i + 2} (${s.name || "onbekend"}):\n${s.text}`;
  });

  const { rawText, providerLabel } = await callWithFallback(systemPrompt, userPrompt);

  const parsed = parseDraftJSON(rawText);
  const combinedSourceText = [sourceText, ...additionalSources.map((s) => s.text)].join("\n");
  const flags = validateDraft({ sourceText: combinedSourceText, draft: parsed });
  const confidence_score = computeConfidence(flags);

  return {
    title: parsed.title,
    body: parsed.body,
    category: parsed.category || "Overig",
    flags,
    confidence_score,
    provider: providerLabel,
    consistency_notes: Array.isArray(parsed.consistency_notes) ? parsed.consistency_notes : [],
    image_keywords: typeof parsed.image_keywords === "string" ? parsed.image_keywords : null,
    claims: Array.isArray(parsed.claims) ? parsed.claims : [],
    location_hint: typeof parsed.location_hint === "string" ? parsed.location_hint : null,
  };
}

const TITLE_VARIANTS_PROMPT = `Je bent een nieuwsredacteur. Op basis van de aangeleverde titel en tekst,
bedenk je 6 alternatieve titels in het Nederlands voor hetzelfde artikel — verschillende
invalshoeken/toonzettingen (feitelijk, urgent, vraagvorm, cijfermatig), maar zonder nieuwe
feiten te verzinnen die niet al in de tekst staan.
Antwoord ALLEEN met geldige JSON in dit exacte formaat, zonder markdown-codeblok:
{"titles": ["...", "...", "...", "...", "...", "..."]}`;

export async function generateTitleVariants({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 2000);
  const userPrompt = `Huidige titel: ${title}\n\nArtikeltekst:\n${plainBody}`;
  const { rawText } = await callWithFallback(TITLE_VARIANTS_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!Array.isArray(parsed.titles)) {
    throw new Error("Geen titelvarianten ontvangen van de AI.");
  }
  return parsed.titles.filter(Boolean);
}

const TRANSLATE_PROMPT_TEMPLATE = (language) => `Je bent een professionele vertaler. Vertaal de aangeleverde
nieuwsartikel-titel en -tekst naar het ${language}, zo natuurlijk mogelijk voor een moedertaalspreker,
zonder feiten toe te voegen, weg te laten of te veranderen. Behoud de alinea-indeling (\\n tussen alinea's).
Antwoord ALLEEN met geldige JSON in dit exacte formaat, zonder markdown-codeblok:
{"title": "...", "body": "..."}`;

const LANGUAGE_LABELS = {
  en: "Engels", de: "Duits", fr: "Frans", es: "Spaans",
};

export async function translateArticle({ title, body, language }) {
  const label = LANGUAGE_LABELS[language];
  if (!label) throw new Error("Onbekende taal: " + language);
  const userPrompt = `Titel: ${title}\n\nTekst:\n${body}`;
  const { rawText } = await callWithFallback(TRANSLATE_PROMPT_TEMPLATE(label), userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.title || !parsed.body) {
    throw new Error("Geen geldige vertaling ontvangen van de AI.");
  }
  return { title: parsed.title, body: parsed.body, language };
}

const SOCIAL_POSTS_PROMPT = `Je bent een social-media-redacteur voor een nieuwssite. Schrijf ALTIJD in het Nederlands, ook
als de aangeleverde titel/tekst woorden in een andere taal bevat. Op basis van de aangeleverde
titel en tekst, schrijf je drie korte, platform-passende posts om dit artikel te promoten:
- "x": max 280 tekens, pakkend, geen hashtag-spam (max 2 hashtags)
- "facebook": iets uitgebreider, uitnodigend om te klikken, informele toon
- "linkedin": zakelijker/informatiever, geschikt voor een professioneel publiek
Verzin geen feiten die niet in de tekst staan. Antwoord ALLEEN met geldige JSON, zonder markdown-codeblok:
{"x": "...", "facebook": "...", "linkedin": "..."}`;

export async function generateSocialPosts({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 2000);
  const userPrompt = `Titel: ${title}\n\nArtikeltekst:\n${plainBody}`;
  const { rawText } = await callWithFallback(SOCIAL_POSTS_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.x && !parsed.facebook && !parsed.linkedin) {
    throw new Error("Geen social-media-posts ontvangen van de AI.");
  }
  return parsed;
}

const PUSH_NOTIFICATION_PROMPT = `Je bent een nieuwsredacteur die pushmeldingen schrijft. Schrijf ALTIJD in het Nederlands, ook
als de aangeleverde titel/tekst woorden in een andere taal bevat. Op basis van de
aangeleverde titel en tekst, bedenk je een korte pushmelding:
- "push_title": max 50 tekens, pakkend
- "push_body": max 120 tekens, geeft de kern van het nieuws zonder de titel te herhalen
Verzin geen feiten die niet in de tekst staan. Antwoord ALLEEN met geldige JSON, zonder markdown-codeblok:
{"push_title": "...", "push_body": "..."}`;

export async function generatePushNotification({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 1500);
  const userPrompt = `Titel: ${title}\n\nArtikeltekst:\n${plainBody}`;
  const { rawText } = await callWithFallback(PUSH_NOTIFICATION_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.push_title || !parsed.push_body) {
    throw new Error("Geen pushmelding ontvangen van de AI.");
  }
  return parsed;
}

const NEWSLETTER_PROMPT = `Je bent een nieuwsredacteur die een nieuwsbrief samenstelt. Schrijf ALTIJD in het Nederlands, ook
als de aangeleverde titel/tekst woorden in een andere taal bevat. Schrijf op basis van
de aangeleverde titel en tekst een korte nieuwsbrief-samenvatting van dit artikel:
- "newsletter_summary": 2-3 zinnen, pakkend, nodigt uit om het volledige artikel te lezen
Verzin geen feiten die niet in de tekst staan. Antwoord ALLEEN met geldige JSON, zonder markdown-codeblok:
{"newsletter_summary": "..."}`;

export async function generateNewsletterSummary({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 2000);
  const userPrompt = `Titel: ${title}\n\nArtikeltekst:\n${plainBody}`;
  const { rawText } = await callWithFallback(NEWSLETTER_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.newsletter_summary) {
    throw new Error("Geen nieuwsbrief-samenvatting ontvangen van de AI.");
  }
  return parsed;
}

function parseDraftJSON(rawText) {
  let cleaned = rawText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1) {
    throw new Error("geen JSON-object gevonden in het antwoord — ruwe respons: " + rawText.slice(0, 200));
  }
  if (end === -1 || end < start) {
    // Begint wel met JSON maar sluit nergens af — vrijwel altijd een teken
    // dat de respons is afgekapt doordat het antwoord de max_tokens-limiet
    // raakte vóórdat de AI klaar was. Los op door in de instellingen een
    // langere/andere provider te proberen, of (voor ontwikkelaars) de
    // max_tokens-waarde in lib/ai-providers/ te verhogen.
    throw new Error(
      "AI-antwoord lijkt afgekapt (geen sluitende '}' gevonden — waarschijnlijk de max_tokens-limiet geraakt) — ruwe respons: " + rawText.slice(0, 200)
    );
  }
  cleaned = cleaned.slice(start, end + 1);
  cleaned = sanitizeJsonControlChars(cleaned);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "kon AI-antwoord niet als JSON parsen: " + err.message + " — ruwe respons: " + rawText.slice(0, 200)
    );
  }
}

/**
 * Sommige modellen (vooral kleinere open-source modellen via Groq/OpenRouter)
 * zetten een letterlijke regeleinde in een JSON-string-waarde (voor
 * alinea's) in plaats van de geëscapete "\n" — dat is ongeldige JSON en
 * geeft anders een "Bad control character"-fout. Deze functie escaped
 * controletekens ALLEEN als ze binnen een string-waarde staan (met een
 * kleine state machine die aanhalingstekens en escape-sequences bijhoudt),
 * zodat legitieme witruimte tussen JSON-velden (bijv. bij mooi
 * geformatteerde output) intact blijft.
 */
function sanitizeJsonControlChars(str) {
  let result = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (!inString) {
      if (ch === '"') inString = true;
      result += ch;
      continue;
    }

    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      result += ch;
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      result += ch;
      continue;
    }
    if (ch === "\n") { result += "\\n"; continue; }
    if (ch === "\r") { continue; }
    if (ch === "\t") { result += "\\t"; continue; }
    result += ch;
  }

  return result;
}

/**
 * Simpele, transparante validatieheuristiek — geen zwarte doos.
 * Dit vervangt geen menselijke controle, het is een signaal voor de reviewer.
 * Werkt hetzelfde ongeacht welke provider het concept leverde.
 */
function validateDraft({ sourceText, draft }) {
  const sourceLower = sourceText.toLowerCase();
  const bodyLower = (draft.body || "").toLowerCase();

  const draftNumbers = [...bodyLower.matchAll(/\d+([.,]\d+)?/g)].map((m) => m[0]);
  const numbersNotInSource = draftNumbers.filter((n) => !sourceLower.includes(n));

  const draftQuotes = [...(draft.body || "").matchAll(/"([^"]{5,})"/g)].map((m) => m[1]);
  const quotesNotInSource = draftQuotes.filter((q) => !sourceText.includes(q));

  return {
    figures_verified: numbersNotInSource.length === 0,
    unverified_figures: numbersNotInSource,
    quote_unverified: quotesNotInSource.length > 0,
    unverified_quotes: quotesNotInSource,
  };
}

function computeConfidence(flags) {
  let score = 1;
  if (!flags.figures_verified) score -= 0.35;
  if (flags.quote_unverified) score -= 0.4;
  return Math.max(0, Math.round(score * 100) / 100);
}
