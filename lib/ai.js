import { getProviderConfig } from "./db";
import { callGoogle } from "./ai-providers/google";
import { callOpenAICompatible } from "./ai-providers/openai-compatible";

const SYSTEM_PROMPT = `Je bent een nieuwsredacteur die volledige, uitgebreide nieuwsartikelen schrijft in het Nederlands, uitsluitend op basis van de aangeleverde brontekst.

Regels, zonder uitzondering:
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
- Bedenk ook 2 tot 4 ENGELSE zoekwoorden die het hoofdonderwerp van het artikel visueel
  omschrijven, geschikt om een passende stockfoto mee te zoeken (bijv. "wildfire firefighters"
  of "government building parliament"). Focus op het onderwerp/de setting, niet op namen van
  specifieke personen of plaatsen die toch niet als stockfoto te vinden zijn.
- Antwoord ALLEEN met geldige JSON, in dit exacte formaat, zonder markdown-codeblok eromheen:
{"title": "...", "body": "...", "category": "Binnenland|Economie|Sport|Tech|Overig", "image_keywords": "..."}`;

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
{"title": "...", "body": "...", "category": "Binnenland|Economie|Sport|Tech|Overig", "consistency_notes": ["...", ...], "image_keywords": "..."}`;

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

function parseDraftJSON(rawText) {
  let cleaned = rawText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("geen JSON-object gevonden in het antwoord — ruwe respons: " + rawText.slice(0, 200));
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
