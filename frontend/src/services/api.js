/**
 * ResQNet Frontend API Service
 * Connects the React UI to the Express + MongoDB backend
 * Proxies voice and translation requests through the secure backend
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const getAuthToken = () => {
  try {
    return localStorage.getItem("resqnet-jwt-token") || "";
  } catch {
    return "";
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) localStorage.setItem("resqnet-jwt-token", token);
    else localStorage.removeItem("resqnet-jwt-token");
  } catch {}
};

/**
 * Common fetch helper with JSON headers, Authorization, and error parsing
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    ...options.headers,
  };

  // If not sending FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.warn(`[ResQNet API] Endpoint ${endpoint} note:`, error.message);
    throw error;
  }
}

/* ─────────────────────────────────────────────────────────────
   INCIDENTS API
   ───────────────────────────────────────────────────────────── */
export const incidentsAPI = {
  getAll: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.priority && params.priority !== "all") qs.append("priority", params.priority);
    if (params.status && params.status !== "all") qs.append("status", params.status);
    if (params.type && params.type !== "all") qs.append("type", params.type);
    if (params.area && params.area !== "all") qs.append("area", params.area);
    if (params.publicOnly) qs.append("publicOnly", "true");
    if (params.search) qs.append("search", params.search);

    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/incidents${query}`);
  },

  getById: async (id) => {
    return request(`/incidents/${id}`);
  },

  create: async (incidentData) => {
    return request("/incidents", {
      method: "POST",
      body: JSON.stringify(incidentData),
    });
  },

  update: async (id, changes) => {
    return request(`/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
  },

  upvote: async (id, deviceId) => {
    return request(`/incidents/${id}/upvote`, {
      method: "POST",
      body: JSON.stringify({ deviceId }),
    });
  },

  track: async (reference) => {
    return request(`/incidents/track/${encodeURIComponent(reference)}`);
  },
};

/* ─────────────────────────────────────────────────────────────
   AUTHENTICATION API
   ───────────────────────────────────────────────────────────── */
export const authAPI = {
  register: async ({ name, email, phone, password, location }) => {
    const res = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password, location }),
    });
    if (res.token) setAuthToken(res.token);
    return res;
  },

  login: async ({ email, password }) => {
    const res = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.token) setAuthToken(res.token);
    return res;
  },

  authorityLogin: async ({ email, password, org }) => {
    const res = await request("/auth/authority-login", {
      method: "POST",
      body: JSON.stringify({ email, password, org }),
    });
    if (res.token) setAuthToken(res.token);
    return res;
  },

  registerOrg: async ({ org, orgType, email }) => {
    return request("/auth/register-org", {
      method: "POST",
      body: JSON.stringify({ org, orgType, email }),
    });
  },

  getProfile: async () => {
    return request("/auth/profile");
  },

  updateProfile: async (data) => {
    return request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  logout: () => {
    setAuthToken(null);
  },
};

/* ─────────────────────────────────────────────────────────────
   GNANI AI VOICE & TRANSLATION API
   ───────────────────────────────────────────────────────────── */
export const gnaniAPI = {
  transcribeVoice: async (audioBlob, languageCode = "indic-auto") => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    } finally {
      await audioContext.close();
    }
    const mono = new Float32Array(audioBuffer.length);
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i += 1) mono[i] += channelData[i] / audioBuffer.numberOfChannels;
    }
    const wavBuffer = new ArrayBuffer(44 + mono.length * 2);
    const view = new DataView(wavBuffer);
    const writeText = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
    writeText(0, "RIFF"); view.setUint32(4, 36 + mono.length * 2, true); writeText(8, "WAVE");
    writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); writeText(36, "data"); view.setUint32(40, mono.length * 2, true);
    for (let i = 0; i < mono.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, mono[i]));
      view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    const formData = new FormData();
    formData.append("audio", new Blob([wavBuffer], { type: "audio/wav" }), "speech.wav");
    formData.append("languageCode", languageCode);

    return request("/ai/stt", {
      method: "POST",
      body: formData,
    });
  },

  synthesizeSpeech: async ({ text, language = "en-IN", voice }) => {
    return request("/ai/tts", {
      method: "POST",
      body: JSON.stringify({ text, language, voice }),
    });
  },

  translateText: async (text, targetLang = "hi", sourceLang, incidentId) => {
    return request("/ai/translate", {
      method: "POST",
      body: JSON.stringify({ text, targetLang, sourceLang, incidentId }),
    });
  },
};

/* ─────────────────────────────────────────────────────────────
   AI FOLLOW-UP CALLS API
   ───────────────────────────────────────────────────────────── */
export const callsAPI = {
  getAll: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/calls${qs ? `?${qs}` : ""}`);
  },

  requestReturnCall: async (reportRef, incidentType) => {
    return request("/calls/request", {
      method: "POST",
      body: JSON.stringify({ reportRef, incidentType }),
    });
  },

  updateCall: async (id, changes) => {
    return request(`/calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
  },
};

/* ─────────────────────────────────────────────────────────────
   ADMIN & ORGANIZATIONS API
   ───────────────────────────────────────────────────────────── */
export const adminAPI = {
  getPendingOrgs: async () => {
    return request("/admin/pending-orgs");
  },

  approveOrg: async (id) => {
    return request(`/admin/approve-org/${id}`, { method: "POST" });
  },

  rejectOrg: async (id) => {
    return request(`/admin/reject-org/${id}`, { method: "POST" });
  },

  getAccounts: async () => {
    return request("/admin/accounts");
  },

  toggleAccount: async (id) => {
    return request(`/admin/accounts/${id}/toggle`, { method: "PATCH" });
  },
};

export default {
  incidents: incidentsAPI,
  auth: authAPI,
  gnani: gnaniAPI,
  calls: callsAPI,
  admin: adminAPI,
};

