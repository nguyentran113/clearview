// Clearview's read-only client for the public make.fun API.
// Two layers of reuse: an in-memory copy revalidated with the API's ETag
// (If-None-Match; the API binds tags to the minute, so a 304 is common),
// and a localStorage last-good copy so a repeat visit paints at once while
// a fresh answer is fetched in the background.
export const API_ORIGIN = 'https://make.fun';

const memory = new Map(); // path -> { etag, data, at }
const STORE_PREFIX = 'clearview:v1:';
const FRESH_MS = 45_000;

function stored(path) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // storage full or blocked: the memory cache still works
  }
}

function store(path, entry) {
  try {
    localStorage.setItem(STORE_PREFIX + path, JSON.stringify(entry));
  } catch {
    /* a last-good copy is a nicety, never a requirement */
  }
}

// fetchJson performs one conditional GET and updates both caches.
// Resolves to the parsed body, or to the cached body on a 304.
async function fetchJson(path) {
  const hit = memory.get(path);
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API_ORIGIN + '/api' + path, { headers });
  if (res.status === 304 && hit) return hit.data;
  if (!res.ok) throw new Error('make.fun API answered ' + res.status + ' for ' + path);
  const data = await res.json();
  const entry = { etag: res.headers.get('etag'), data, at: Date.now() };
  memory.set(path, entry);
  store(path, entry);
  return data;
}

// get returns the best answer for a path: a fresh memory copy at once, a
// stored last-good copy at once with onFresh called when revalidation
// lands, or the network answer when nothing is cached yet.
export async function get(path, onFresh) {
  const hit = memory.get(path);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data;
  if (!hit) {
    const saved = stored(path);
    if (saved && saved.data !== undefined) {
      memory.set(path, saved);
      fetchJson(path)
        .then((data) => { if (onFresh) onFresh(data); })
        .catch(() => {});
      return saved.data;
    }
  }
  return fetchJson(path);
}

// peek returns whatever is cached for a path right now, or null.
export function peek(path) {
  const hit = memory.get(path);
  if (hit) return hit.data;
  const saved = stored(path);
  return saved ? saved.data : null;
}
