/**
 * VoiceRecorder.jsx
 * Reusable voice recording panel for emergency reports.
 * Integrates with Gnani Prisma STT via backend /api/ai/stt
 *
 * Props:
 *   onTranscript(text, detectedLanguage) — called when STT completes
 *   onError(msg) — called on recording/STT failure
 */
import React, { useState, useRef, useEffect } from "react";
import { Icon } from "../common/Icon.jsx";
import { gnaniAPI } from "../../services/api.js";

const SUPPORTED_LANGUAGES = [
  { code: "indic-auto", label: "Auto-detect (Indic / English)" },
  { code: "kn-IN", label: "ಕನ್ನಡ — Kannada" },
  { code: "hi-IN", label: "हिन्दी — Hindi" },
  { code: "ta-IN", label: "தமிழ் — Tamil" },
  { code: "te-IN", label: "తెలుగు — Telugu" },
  { code: "bn-IN", label: "বাংলা — Bengali" },
  { code: "mr-IN", label: "मराठी — Marathi" },
  { code: "gu-IN", label: "ગુજરાતી — Gujarati" },
  { code: "ml-IN", label: "മലയാളം — Malayalam" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ — Punjabi" },
  { code: "en-IN", label: "English (India)" },
];

export function VoiceRecorder({ onTranscript, onError, disabled }) {
  const [phase, setPhase] = useState("idle"); // idle | recording | processing | done | error
  const [elapsed, setElapsed] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [langCode, setLangCode] = useState("indic-auto");
  const [detectedLang, setDetectedLang] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);
  const timerRef = useRef(null);
  const recorderLimitRef = useRef(null);
  const audioURLRef = useRef(null);

  // Clean up on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(recorderLimitRef.current);
    if (audioURLRef.current) URL.revokeObjectURL(audioURLRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("Your browser does not support microphone access. Please use Chrome or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      clearTimeout(recorderLimitRef.current);
      if (audioURLRef.current) URL.revokeObjectURL(audioURLRef.current);
      audioURLRef.current = null;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      setElapsed(0);
      setAudioURL(null);
      setDetectedLang(null);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || audioChunksRef.current[0]?.type || "audio/webm" });
        audioBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        audioURLRef.current = url;
        setAudioURL(url);
        setPhase("done");
        setStatusMsg("Recording complete. Listen to your recording or convert it to text.");
      };

      mr.start(250); // collect chunks every 250ms
      setPhase("recording");
      setStatusMsg("Recording... speak your emergency details clearly.");

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      recorderLimitRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setStatusMsg("Maximum Prisma clip length reached. Review or convert the recording.");
        }
      }, 30000);
    } catch (err) {
      setPhase("error");
      const msg =
        err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access and try again."
          : `Could not start recording: ${err.message}`;
      setStatusMsg(msg);
      onError?.(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    clearTimeout(recorderLimitRef.current);
  };

  const discardRecording = () => {
    setPhase("idle");
    clearTimeout(recorderLimitRef.current);
    if (audioURLRef.current) URL.revokeObjectURL(audioURLRef.current);
    audioURLRef.current = null;
    setAudioURL(null);
    audioBlobRef.current = null;
    setStatusMsg("");
    setDetectedLang(null);
    setElapsed(0);
  };

  const convertToText = async () => {
    if (!audioBlobRef.current) return;
    setPhase("processing");
    setStatusMsg("Sending to Gnani Prisma for speech-to-text conversion…");

    try {
      const result = await gnaniAPI.transcribeVoice(audioBlobRef.current, langCode);
      const transcript = result.transcript || "";
      const detected = result.detectedLanguage || langCode;
      setDetectedLang(detected);

      if (!transcript.trim()) {
        setPhase("error");
        setStatusMsg("No speech was detected in the recording. Please try again.");
        onError?.("No speech detected.");
        return;
      }

      setPhase("done");
      const sourceLabel = "Gnani Prisma";
      setStatusMsg(
        `Transcribed via ${sourceLabel}${detected && detected !== "indic-auto" ? ` · Detected: ${detected}` : ""}. Review and edit the text above before submitting.`
      );
      onTranscript?.(transcript, detected);
    } catch (err) {
      setPhase("error");
      const msg = `Transcription failed: ${err.message || "Please try again."}`;
      setStatusMsg(msg);
      onError?.(msg);
    }
  };

  return (
    <div className="voice-recorder-panel" aria-label="Voice recording">
      {/* Language selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Icon name="globe" size={14} style={{ color: "var(--teal)", flexShrink: 0 }} />
        <label className="field-label" style={{ marginBottom: 0, whiteSpace: "nowrap" }}>
          Speak in:
        </label>
        <select
          className="input input-sm"
          style={{ flex: 1 }}
          value={langCode}
          onChange={(e) => setLangCode(e.target.value)}
          disabled={phase === "recording" || phase === "processing"}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main control row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Record / Stop button */}
        {phase === "idle" && (
          <button
            type="button"
            className="voice-action-btn record"
            onClick={startRecording}
            disabled={disabled}
            aria-label="Start recording"
          >
            <span className="voice-action-btn-icon">
              <Icon name="mic" size={18} />
            </span>
            <span>Record Emergency</span>
          </button>
        )}

        {phase === "recording" && (
          <button
            type="button"
            className="voice-action-btn stop"
            onClick={stopRecording}
            aria-label="Stop recording"
          >
            <span className="voice-action-btn-icon recording-dot" />
            <span>Stop Recording</span>
            <span className="recording-timer">{fmtTime(elapsed)}</span>
          </button>
        )}

        {phase === "processing" && (
          <div className="voice-action-btn processing" aria-live="polite">
            <span className="spinner" />
            <span>Converting to text…</span>
          </div>
        )}

        {phase === "done" && (
          <>
            {/* Playback */}
            {audioURL && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--ink-muted)", fontWeight: 600 }}>
                  <Icon name="mic" size={12} style={{ marginRight: 4 }} />
                  Your recording:
                </span>
                <audio
                  src={audioURL}
                  controls
                  style={{ height: 32, borderRadius: 999 }}
                  aria-label="Playback of your recording"
                />
              </div>
            )}

            {/* Convert to Text */}
            <button
              type="button"
              className="voice-action-btn convert"
              onClick={convertToText}
            >
              <Icon name="zap" size={14} />
              <span>Convert to Text</span>
            </button>

            {/* Record Again */}
            <button
              type="button"
              className="voice-action-btn discard"
              onClick={discardRecording}
              aria-label="Discard and record again"
            >
              <Icon name="refresh" size={13} />
              <span>Record Again</span>
            </button>
          </>
        )}

        {phase === "error" && (
          <button
            type="button"
            className="voice-action-btn record"
            onClick={discardRecording}
          >
            <Icon name="mic" size={14} />
            <span>Try Again</span>
          </button>
        )}
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className={`voice-status-msg ${phase === "error" ? "error" : phase === "recording" ? "recording" : "info"}`}
          role="status"
          aria-live="polite"
        >
          {phase === "error" ? (
            <Icon name="alert" size={13} />
          ) : phase === "recording" ? (
            <span className="pulse-dot" />
          ) : (
            <Icon name="checkCircle" size={13} />
          )}
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Detected language badge */}
      {detectedLang && detectedLang !== "indic-auto" && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <Icon name="globe" size={11} style={{ color: "var(--teal)" }} />
          <span style={{ color: "var(--ink-muted)" }}>Detected language:</span>
          <span style={{ fontWeight: 600, color: "var(--teal)" }}>{detectedLang}</span>
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;

