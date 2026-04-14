// frontend/utils/auth.js
const TOKEN_KEY = "miespanol_token";
const USER_KEY = "miespanol_user";

export function saveToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* ignore */ }
}

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

export function saveUser(user) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user || null)); } catch (e) { /* ignore */ }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("getUser parse error", e);
    return null;
  }
}

export function removeAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) { /* ignore */ }
}

export function saveAuth({ token, user }) {
  if (token) saveToken(token);
  if (user) saveUser(user);
}

export async function apiAuthFetch(path, opts = {}) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
  const url = path.startsWith("http") ? path : (path.startsWith("/") ? `${base}${path}` : `${base}/${path}`);

  const token = getToken();

  // clone headers so we can manipulate safely
  const headers = Object.assign({}, opts.headers || {});

  let bodyToSend = opts.body;

  // If body is a plain object (not FormData), stringify and set JSON header
  const isFormData = typeof FormData !== "undefined" && bodyToSend instanceof FormData;
  const isPlainObject = bodyToSend && typeof bodyToSend === "object" && !isFormData && !(bodyToSend instanceof Blob);

  if (isPlainObject) {
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
    bodyToSend = JSON.stringify(bodyToSend);
  }

  // If FormData, DO NOT set Content-Type (browser sets boundary)
  if (isFormData) {
    // remove any Content-Type to avoid messing boundary
    if (headers["Content-Type"]) delete headers["Content-Type"];
    if (headers["content-type"]) delete headers["content-type"];
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, Object.assign({}, opts, { headers, body: bodyToSend }));
  } catch (networkErr) {
    // network error (CORS, offline, etc)
    return { ok: false, status: 0, body: null, rawText: null, error: networkErr.message || String(networkErr) };
  }

  let rawText = null;
  let parsed = null;
  try {
    // try parse as text first (so we can fallback)
    rawText = await res.text();
    // try to parse json if looks like JSON
    const maybe = rawText && rawText.trim();
    if (maybe && (maybe.startsWith("{") || maybe.startsWith("[") || maybe.startsWith('"'))) {
      try {
        parsed = JSON.parse(maybe);
      } catch (je) {
        parsed = null;
      }
    }
  } catch (e) {
    // ignore
  }

  return { ok: res.ok, status: res.status, body: parsed, rawText, error: null };
}
