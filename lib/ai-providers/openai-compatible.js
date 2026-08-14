// Groq en OpenRouter bieden allebei een OpenAI-compatibele
// chat-completions-API aan, dus één generieke fetch-aanroep bedient beide —
// scheelt een extra SDK-dependency per provider.
export async function callOpenAICompatible({ baseUrl, apiKey, model, systemPrompt, userPrompt, extraParams = {} }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      ...extraParams,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${bodyText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Geen tekstantwoord ontvangen van de provider.");
  return content;
}
