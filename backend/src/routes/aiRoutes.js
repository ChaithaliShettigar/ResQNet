import express from "express";
import multer from "multer";
import {
  handleSpeechToText,
  handleTextToSpeech,
  handleTranslate,
  handlePrioritize,
} from "../controllers/aiController.js";

const router = express.Router();

// Configure multer memory storage for audio streams (e.g. up to 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Gnani Prisma Speech-to-Text
router.post("/stt", upload.single("audio"), handleSpeechToText);

// Gnani Timbre Text-to-Speech
router.post("/tts", handleTextToSpeech);

// Multilingual Incident Translation
router.post("/translate", handleTranslate);

// Urgency Prioritization Sandbox
router.post("/prioritize", handlePrioritize);

export default router;

