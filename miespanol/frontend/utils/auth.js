// frontend/utils/auth.js
export function saveToken(token) {
  try { localStorage.setItem('miespanol_token', token); } catch(e){/*no-op*/ }
}
export function getToken() {
  try { return localStorage.getItem('miespanol_token'); } catch(e){ return null; }
}
export function saveUser(user) {
  try { localStorage.setItem('miespanol_user', JSON.stringify(user)); } catch(e) {}
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem('miespanol_user')); } catch(e){ return null; }
}
export function removeAuth() {
  try { localStorage.removeItem('miespanol_token'); localStorage.removeItem('miespanol_user'); } catch(e){}
}

export async function apiAuthFetch(path, opts = {}) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  const token = getToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  let body = null;
  try { body = await res.json(); } catch(e){}
  return { ok: res.ok, status: res.status, body };
}
