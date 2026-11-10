const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function askOpenRouter(messages, { json = false } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    const error = new Error("LLM services are not configured. Add OPENROUTER_API_KEY and OPENROUTER_MODEL to backend/.env.");
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.APP_URL || "http://localhost:5173", "X-Title": "ResQNet" },
    body: JSON.stringify({ model, messages, temperature: 0.2, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`OpenRouter request failed (${response.status}): ${detail.slice(0, 500)}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function translateIncidentText(text, targetLang = "hi", sourceLang) {
  if (!text?.trim()) return text;
  const content = await askOpenRouter([
    { role: "system", content: "Translate the user's text faithfully into the requested target language. Preserve meaning, names, numbers, emergency details, and tone. Return only the translation." },
    { role: "user", content: `Target language: ${targetLang}\n${sourceLang ? `Source language: ${sourceLang}\n` : ""}Text:\n${text}` },
  ]);
  if (!content) throw new Error("OpenRouter returned an empty translation.");
  return content;
}

export async function analyzeIncidentWithLLM(incident) {
  const content = await askOpenRouter([
    { role: "system", content: "Analyze this emergency report for responders. Return only JSON with keys: priority (one of low, medium, high, critical), aiReason (brief factual explanation), missing (array of critical details to verify). Do not infer facts absent from the report. Never lower urgency based on missing information." },
    { role: "user", content: JSON.stringify(incident) },
  ], { json: true });
  try {
    const result = JSON.parse(content);
    const priorities = ["low", "medium", "high", "critical"];
    return { priority: priorities.includes(result.priority) ? result.priority : null, aiReason: typeof result.aiReason === "string" ? result.aiReason.slice(0, 1000) : "", missing: Array.isArray(result.missing) ? result.missing.filter((item) => typeof item === "string").slice(0, 12) : [] };
  } catch {
    throw new Error("OpenRouter returned an invalid incident analysis.");
  }
}

