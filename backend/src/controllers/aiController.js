import {
  transcribeAudio,
  synthesizeSpeech,
  translateIncidentText,
} from "../services/gnaniService.js";
import { analyzeIncidentUrgency } from "../services/prioritizationService.js";
import { analyzeIncidentWithLLM } from "../services/openRouterService.js";

/**
 * 1. Speech-to-Text (Gnani Prisma)
 * POST /api/ai/stt
 * Accepts multipart/form-data with 'audio' or JSON with base64
 */
export const handleSpeechToText = async (req, res, next) => {
  try {
    let audioBuffer = null;
    let filename = "recording.wav";
    const languageCode = req.body.languageCode || req.query.language || "indic-auto";

    if (req.file) {
      audioBuffer = req.file.buffer;
      filename = req.file.originalname;
    } else if (req.body.audioBase64) {
      const cleanBase64 = req.body.audioBase64.replace(/^data:audio\/\w+;base64,/, "");
      audioBuffer = Buffer.from(cleanBase64, "base64");
    }

    const result = await transcribeAudio(audioBuffer, filename, languageCode, req.file?.mimetype || "audio/webm");

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Text-to-Speech (Gnani Timbre)
 * POST /api/ai/tts
 * Accepts { text, language, voice, speed }
 */
export const handleTextToSpeech = async (req, res, next) => {
  try {
    const { text, language = "en-IN", voice, speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text field is required for voice synthesis.",
      });
    }

    const result = await synthesizeSpeech({ text, language, voice, speed });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Multilingual Translation
 * POST /api/ai/translate
 * Accepts { text, targetLang }
 */
export const handleTranslate = async (req, res, next) => {
  try {
    const { text, targetLang = "hi", sourceLang, incidentId } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text field is required for translation.",
      });
    }

    const translatedText = await translateIncidentText(text, targetLang, sourceLang);

    if (incidentId) {
      const Incident = (await import("../models/Incident.js")).default;
      await Incident.findOneAndUpdate(
        { $or: [{ id: incidentId }, { reference: incidentId }] },
        { $set: { [`translations.${targetLang}`]: translatedText } }
      );
    }

    res.status(200).json({
      success: true,
      originalText: text,
      targetLanguage: targetLang,
      translatedText,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Urgency Prioritization Sandbox Preview
 * POST /api/ai/prioritize
 */
export const handlePrioritize = async (req, res, next) => {
  try {
    const analysis = await analyzeIncidentWithLLM(req.body);
    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

