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
- Antwoord ALLEEN met geldige JSON, in dit exacte formaat, zonder markdown-codeblok eromheen:
{"title": "...", "body": "...", "category": "Binnenland|Economie|Sport|Tech|Overig"}`;
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
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "meta-llama/llama-3.3-70b-instruct:free",
        systemPrompt,
        userPrompt,
      }),
  },
];

export { PROVIDERS };

export async function generateDraft({ sourceText, sourceName }) {
  const userPrompt = `Bron: ${sourceName}\n\nBrontekst:\n${sourceText}`;
  const attempted = [];

  for (const provider of PROVIDERS) {
    const cfg = getProviderConfig(provider.id);
    if (!cfg?.api_key) continue;

    try {
      const rawText = await provider.call(cfg, SYSTEM_PROMPT, userPrompt);
      const parsed = parseDraftJSON(rawText);
      const flags = validateDraft({ sourceText, draft: parsed });
      const confidence_score = computeConfidence(flags);

      return {
        title: parsed.title,
        body: parsed.body,
        category: parsed.category || "Overig",
        flags,
        confidence_score,
        provider: provider.label,
      };
    } catch (err) {
      attempted.push(`${provider.label}: ${err.message}`);
    }
  }

  if (attempted.length === 0) {
    throw new Error(
      "Er is nog geen AI-provider ingesteld. Voeg minstens één API-key toe via Instellingen."
    );
  }
  throw new Error("Alle geconfigureerde providers faalden — " + attempted.join(" | "));
}

function parseDraftJSON(rawText) {
  let cleaned = rawText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("geen JSON-object gevonden in het antwoord — ruwe respons: " + rawText.slice(0, 200));
  }
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "kon AI-antwoord niet als JSON parsen: " + err.message + " — ruwe respons: " + rawText.slice(0, 200)
    );
  }
}

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
