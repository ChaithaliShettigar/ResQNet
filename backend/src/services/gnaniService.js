const GNANI_BASE_URL = process.env.GNANI_API_BASE_URL || "https://api.vachana.ai";
const speechCache = new Map();

function requireGnaniKey() {
  const key = process.env.GNANI_API_KEY;
  if (!key || key === "your_gnani_api_key_here") {
    const error = new Error("Voice services are not configured. Add GNANI_API_KEY to backend/.env.");
    error.statusCode = 503;
    throw error;
  }
  return key;
}

async function apiError(response, service) {
  const body = await response.text();
  let message = body;
  try {
    const parsed = JSON.parse(body);
    message = parsed.message || parsed.error?.message || parsed.detail?.message || body;
  } catch {}
  const error = new Error(`${service} request failed (${response.status}): ${message}`);
  error.statusCode = response.status >= 500 ? 502 : response.status;
  throw error;
}

export async function transcribeAudio(audioBuffer, originalFilename, languageCode = "indic-auto", mimeType = "audio/webm") {
  if (!audioBuffer?.length) {
    const error = new Error("No audio recording was received.");
    error.statusCode = 400;
    throw error;
  }
  const key = requireGnaniKey();
  const form = new FormData();
  form.append("audio_file", new Blob([audioBuffer], { type: mimeType }), originalFilename || "recording.webm");
  form.append("model", process.env.GNANI_STT_MODEL || "prisma-v3.0");
  form.append("language_code", languageCode || "indic-auto");
  const response = await fetch(`${GNANI_BASE_URL}/stt/v3`, {
    method: "POST", headers: { "X-API-Key-ID": key }, body: form,
  });
  if (!response.ok) await apiError(response, "Gnani Prisma");
  const data = await response.json();
  return {
    success: true,
    source: "gnani-prisma",
    transcript: data.transcript || "",
    detectedLanguage: data.detected_language_code || data.language_code || languageCode,
    requestId: data.request_id,
  };
}

export async function synthesizeSpeech({ text, language = "en-IN", voice, speed = 1.0 }) {
  if (!text?.trim()) {
    const error = new Error("Text is required for speech generation.");
    error.statusCode = 400;
    throw error;
  }
  const cacheKey = `${language}:${voice || "default"}:${speed}:${text}`;
  if (speechCache.has(cacheKey)) return { ...speechCache.get(cacheKey) };
  const key = requireGnaniKey();
  const model = process.env.GNANI_TTS_MODEL || "timbre-v3.0";
  const voicesByLanguage = { "en-IN": "Kaveri", "hi-IN": "Nalini", "kn-IN": "Kavin", "ta-IN": "Asmita", "te-IN": "Suhana", "bn-IN": "Kirra", "mr-IN": "Zahira", "gu-IN": "Falak", "ml-IN": "Reshma", "pa-IN": "Mehuli" };
  const selectedVoice = voice || (model === "timbre-v3.0" ? "Shivani" : voicesByLanguage[language]);
  const response = await fetch(`${GNANI_BASE_URL}/api/v1/tts/inference`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key-ID": key },
    body: JSON.stringify({
      text, model, ...(selectedVoice ? { voice: selectedVoice } : {}), language, speed,
      audio_config: { encoding: "linear_pcm", container: "wav", num_channels: 1, sample_rate: 24000, sample_width: 2 },
    }),
  });
  if (!response.ok) await apiError(response, "Gnani Timbre");
  const audioBase64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  const result = { success: true, source: "gnani-timbre", audioBase64: `data:audio/wav;base64,${audioBase64}`, format: "wav" };
  if (speechCache.size >= 50) speechCache.delete(speechCache.keys().next().value);
  speechCache.set(cacheKey, result);
  return { ...result };
}

const GOOGLE_LANGUAGE_CODES = { en: "en", hi: "hi", kn: "kn", ta: "ta", te: "te", bn: "bn", mr: "mr", gu: "gu", ml: "ml", pa: "pa", ur: "ur" };
import { translateIncidentText as openRouterTranslate } from "./openRouterService.js";

export async function translateIncidentText(text, targetLang = "hi", sourceLang) {
  if (!text?.trim()) return text;
  if (!GOOGLE_LANGUAGE_CODES[targetLang]) {
    const error = new Error(`Translation to '${targetLang}' is not supported.`);
    error.statusCode = 400;
    throw error;
  }
  return openRouterTranslate(text, GOOGLE_LANGUAGE_CODES[targetLang], sourceLang);
}

export default { transcribeAudio, synthesizeSpeech, translateIncidentText };
