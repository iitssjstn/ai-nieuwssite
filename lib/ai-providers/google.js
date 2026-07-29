import { GoogleGenerativeAI } from "@google/generative-ai";

export async function callGoogle({ apiKey, model, systemPrompt, userPrompt }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model: model || "gemini-3.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
    },
  });

  const result = await genModel.generateContent(userPrompt);
  return result.response.text();
}
