/**
 * TranslationPanel.jsx
 * Reusable translation + TTS panel for incident descriptions.
 * Shows original text, allows language selection, translates via backend,
 * and plays audio via Gnani Timbre TTS.
 *
 * Props:
 *   text          — the original text to translate/speak
 *   originalLang  — ISO code of original language (e.g. "kn-IN")
 *   compact       — boolean, renders a compact inline version for dashboards
 */
import React, { useState, useRef } from "react";
import { Icon } from "../common/Icon.jsx";
import { gnaniAPI } from "../../services/api.js";

export const TRANSLATE_LANGUAGES = [
  { code: "en", label: "🌐 English" },
  { code: "hi", label: "🌐 हिन्दी — Hindi" },
  { code: "kn", label: "🌐 ಕನ್ನಡ — Kannada" },
  { code: "ta", label: "🌐 தமிழ் — Tamil" },
  { code: "te", label: "🌐 తెలుగు — Telugu" },
  { code: "bn", label: "🌐 বাংলা — Bengali" },
  { code: "mr", label: "🌐 मराठी — Marathi" },
  { code: "gu", label: "🌐 ગુજરાતી — Gujarati" },
  { code: "ml", label: "🌐 മലയാളം — Malayalam" },
  { code: "pa", label: "🌐 ਪੰਜਾਬੀ — Punjabi" },
];

/** Language code → human-readable name */
export const langName = (code) => {
  const lang = TRANSLATE_LANGUAGES.find(
    (l) => l.code === code || l.code === code?.split("-")[0]
  );
  if (lang) return lang.label.replace(/^🌐 /, "");
  if (code?.startsWith("en")) return "English";
  if (code?.startsWith("kn")) return "Kannada";
  if (code?.startsWith("hi")) return "Hindi";
  if (code?.startsWith("ta")) return "Tamil";
  if (code?.startsWith("te")) return "Telugu";
  if (code?.startsWith("bn")) return "Bengali";
  if (code?.startsWith("mr")) return "Marathi";
  if (code?.startsWith("gu")) return "Gujarati";
  if (code?.startsWith("ml")) return "Malayalam";
  if (code?.startsWith("pa")) return "Punjabi";
  return code || "Unknown";
};

/** Map supported language codes to the BCP-47 locale accepted by Gnani Timbre. */
const toSpeechLang = (code) => {
  const map = {
    hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN",
    bn: "bn-IN", mr: "mr-IN", gu: "gu-IN", en: "en-IN",
    "en-IN": "en-IN", "kn-IN": "kn-IN", "hi-IN": "hi-IN",
    "ta-IN": "ta-IN", "te-IN": "te-IN", "ml": "ml-IN", "ml-IN": "ml-IN",
  };
  return map[code] || "en-IN";
};

const speechCache = new Map();

function useTTS() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const audioKeyRef = useRef(null);

  const play = async (text, langCode) => {
    const cacheKey = `${langCode}:${text}`;
    if (audioRef.current && audioKeyRef.current === cacheKey && audioRef.current.paused) {
      await audioRef.current.play();
      setPlaying(true);
      return;
    }
    // Stop any current playback
    stop();
    setError(null);
    setLoading(true);

    try {
      let res = speechCache.get(cacheKey);
      if (!res) {
        res = await gnaniAPI.synthesizeSpeech({ text, language: toSpeechLang(langCode) });
        if (res.audioBase64) speechCache.set(cacheKey, res);
      }

      if (res.audioBase64 && res.audioBase64.startsWith("data:")) {
        // Gnani Timbre binary audio
        const audio = new Audio(res.audioBase64);
        audioRef.current = audio;
        audioKeyRef.current = cacheKey;
        audio.onended = () => setPlaying(false);
        audio.onerror = () => {
          setPlaying(false);
          setError("Audio playback failed.");
        };
        setLoading(false);
        setPlaying(true);
        await audio.play();
      } else {
        setLoading(false);
        throw new Error("Gnani Timbre did not return playable audio.");
      }
    } catch (err) {
      setLoading(false);
      setError(`Could not play audio: ${err.message}`);
      setPlaying(false);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      audioKeyRef.current = null;
    }
    setPlaying(false);
  };

  const pause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const replay = (text, lang) => {
    stop();
    play(text, lang);
  };

  return { play, stop, pause, replay, playing, loading, error };
}

export function TranslationPanel({ text, originalLang, compact = false, incidentId, onTranslation, translations = {} }) {
  const [targetLang, setTargetLang] = useState("en");
  const [languageSearch, setLanguageSearch] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translationStore, setTranslationStore] = useState(translations || {});
  const [translated, setTranslated] = useState(translations?.en || null);
  const [translateError, setTranslateError] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const tts = useTTS();

  if (!text) return null;

  const displayText = showOriginal ? text : (translated || text);
  const displayLang = showOriginal ? (originalLang || "original") : (translated ? targetLang : (originalLang || "en"));

  const handleTranslate = async () => {
    if (targetLang === "en" && !originalLang?.startsWith("en")) {
      // Translate to English — treat as a translation request
    } else if (targetLang === (originalLang?.split("-")[0])) {
      // Same language — just show original
      setTranslated(null);
      setShowOriginal(true);
      return;
    }
    setTranslating(true);
    setTranslateError(null);
    setShowOriginal(false);
    try {
      const res = await gnaniAPI.translateText(text, targetLang, originalLang, incidentId);
      setTranslated(res.translatedText || text);
      setTranslationStore((stored) => ({ ...stored, [targetLang]: res.translatedText || text }));
      onTranslation?.(targetLang, res.translatedText || text);
    } catch (err) {
      setTranslateError(`Translation failed: ${err.message}`);
    } finally {
      setTranslating(false);
    }
  };

  if (compact) {
    // Compact inline version for dashboard incident cards
    return (
      <div className="tp-compact" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* TTS Listen button */}
          <button
            type="button"
            className={`tp-btn listen${tts.playing ? " active" : ""}`}
            onClick={() => tts.playing ? tts.pause() : tts.play(displayText, displayLang)}
            disabled={tts.loading}
            title="Listen to this description"
          >
            {tts.loading ? (
              <span className="spinner-xs" />
            ) : (
              <Icon name="speaker" size={12} />
            )}
            {tts.playing ? "Pause" : tts.loading ? "Loading…" : "Listen"}
          </button>
          <button
            type="button"
            className="tp-btn ghost"
            onClick={() => tts.replay(displayText, displayLang)}
            disabled={tts.loading}
            title="Replay this report"
          >
            <Icon name="refresh" size={12} /> Replay
          </button>

          {/* Language selector */}
          <input
            className="input input-xs"
            type="search"
            value={languageSearch}
            placeholder="Search language"
            aria-label="Search languages"
            onChange={(e) => setLanguageSearch(e.target.value)}
            style={{ width: 150 }}
          />
          <select
            className="input input-xs"
            style={{ width: "auto" }}
            value={targetLang}
            onChange={(e) => { setTargetLang(e.target.value); setTranslated(translationStore[e.target.value] || null); setShowOriginal(false); }}
          >
            {TRANSLATE_LANGUAGES.filter((l) => `${l.code} ${l.label}`.toLowerCase().includes(languageSearch.toLowerCase())).map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          {/* Translate button */}
          <button
            type="button"
            className="tp-btn translate"
            onClick={handleTranslate}
            disabled={translating}
          >
            {translating ? <span className="spinner-xs" /> : <Icon name="globe" size={12} />}
            {translating ? "Translating…" : "Translate"}
          </button>

          {/* Toggle original */}
          {translated && (
            <button
              type="button"
              className="tp-btn ghost"
              onClick={() => setShowOriginal((p) => !p)}
            >
              {showOriginal ? "Show Translation" : "Original"}
            </button>
          )}
        </div>

        {/* Translated / displayed text */}
        {translated && !showOriginal && (
          <div className="tp-translated-text compact" aria-live="polite">
            <span className="tp-lang-badge">{langName(targetLang)}</span>
            <p>{translated}</p>
          </div>
        )}

        {/* Errors */}
        {(translateError || tts.error) && (
          <div className="tp-error" role="alert">
            <Icon name="alert" size={12} /> {translateError || tts.error}
          </div>
        )}
      </div>
    );
  }

  // Full version for EmergencyReport and detailed views
  return (
    <div className="translation-panel">
      <div className="tp-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="globe" size={16} style={{ color: "var(--teal)" }} />
          <span className="tp-title">Translation & Audio</span>
        </div>
        {originalLang && (
          <span className="tp-orig-lang-badge">
            Original: {langName(originalLang)}
          </span>
        )}
      </div>

      {/* Current text display */}
      <div className="tp-text-box" aria-live="polite">
        {translating ? (
          <div className="tp-loading-row">
            <span className="spinner" />
            <span>Translating to {langName(targetLang)}…</span>
          </div>
        ) : (
          <>
            <div className="tp-text-label">
              {showOriginal || !translated
                ? <><Icon name="globe" size={11} /> {originalLang ? langName(originalLang) : "Original"}</>
                : <><Icon name="globe" size={11} /> {langName(targetLang)} (translated)</>
              }
            </div>
            <p className="tp-text-content">{displayText}</p>
          </>
        )}
      </div>

      {/* Controls row */}
      <div className="tp-controls">
        {/* Language selector */}
        <div style={{ flex: 1 }}>
          <label className="field-label" style={{ marginBottom: 4 }}>Translate to</label>
          <input
            className="input input-sm"
            type="search"
            placeholder="Search languages"
            aria-label="Search languages"
            onChange={(e) => setLanguageSearch(e.target.value)}
            style={{ marginBottom: 6 }}
          />
          <select
            className="input input-sm"
            value={targetLang}
            onChange={(e) => { setTargetLang(e.target.value); setTranslated(translationStore[e.target.value] || null); setShowOriginal(false); }}
          >
            {TRANSLATE_LANGUAGES.filter((l) => `${l.code} ${l.label}`.toLowerCase().includes((languageSearch || "").toLowerCase())).map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
          {/* Translate button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleTranslate}
            disabled={translating}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {translating ? <span className="spinner-xs" /> : <Icon name="globe" size={13} />}
            {translating ? "Translating…" : "Translate"}
          </button>

          {/* Toggle original */}
          {translated && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setShowOriginal((p) => !p)}
            >
              {showOriginal ? "Show Translation" : "Show Original"}
            </button>
          )}
        </div>
      </div>

      {/* TTS row */}
      <div className="tp-tts-row">
        <Icon name="speaker" size={14} style={{ color: "var(--teal)", flexShrink: 0 }} />
        <span className="tp-tts-label">Listen to {showOriginal || !translated ? "original" : langName(targetLang)} description:</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`btn btn-secondary btn-sm${tts.playing ? " btn-tts-active" : ""}`}
            onClick={() => tts.playing ? tts.pause() : tts.play(displayText, displayLang)}
            disabled={tts.loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {tts.loading ? (
              <><span className="spinner-xs" /> Loading audio…</>
            ) : tts.playing ? (
              <><Icon name="pause" size={13} /> Pause</>
            ) : (
              <><Icon name="speaker" size={13} /> Play</>
            )}
          </button>
          {!tts.loading && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => tts.replay(displayText, displayLang)}
            >
              <Icon name="refresh" size={12} /> Replay
            </button>
          )}
        </div>
      </div>

      {/* Errors */}
      {(translateError || tts.error) && (
        <div className="tp-error" role="alert">
          <Icon name="alert" size={13} />
          {translateError || tts.error}
          <span style={{ fontSize: 11, color: "var(--ink-muted)", marginLeft: 6 }}>
            (Original report is preserved)
          </span>
        </div>
      )}
    </div>
  );
}

export default TranslationPanel;

