// GeniusLink (geni.us) universal link wrapper. Turns any destination URL into a
// managed geni.us short link that auto-applies the correct retailer affiliate
// ID + geo-localises — so affiliate IDs are configured ONCE in the GeniusLink
// dashboard, never per-provider in code.
//
// API: POST https://api.geni.us/v3/shorturls  (headers X-Api-Key / X-Api-Secret)
//   body { url, groupId, domain, linkCreatorSetting:'Simple' } -> { shortUrl:{ code } }
//
// Results are cached in data/geniuslink-cache.json (destination URL -> short
// URL) so the same link is never re-created and we don't burn API calls. On any
// error or missing config, returns the ORIGINAL url so links never break.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url)))); // scripts/lib -> root
const CACHE_FILE = join(ROOT, 'data', 'geniuslink-cache.json');
const REQUEST_TIMEOUT_MS = 15000;

let cache = null;
let dirty = false;
function load() {
  if (cache) return cache;
  cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
  return cache;
}

export function geniusEnabled() {
  return Boolean(process.env.GENIUSLINK_API_KEY && process.env.GENIUSLINK_API_SECRET && process.env.GENIUSLINK_GROUP_ID);
}

export async function geniusWrap(url) {
  if (!url || !geniusEnabled()) return url;
  const c = load();
  if (c[url]) return c[url];
  const domain = process.env.GENIUSLINK_DOMAIN || 'geni.us';
  let timeout;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch('https://api.geni.us/v3/shorturls', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-Api-Key': process.env.GENIUSLINK_API_KEY,
        'X-Api-Secret': process.env.GENIUSLINK_API_SECRET,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        url,
        groupId: Number(process.env.GENIUSLINK_GROUP_ID),
        domain,
        linkCreatorSetting: 'Simple',
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return url;
    const code = (await res.json())?.shortUrl?.code;
    if (!code) return url;
    const short = `https://${domain}/${code}`;
    c[url] = short;
    dirty = true;
    return short;
  } catch {
    return url;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

// Wrap a list of URLs sequentially (cache makes repeats instant) and persist.
export async function geniusWrapAll(urls) {
  const out = [];
  for (const u of urls) out.push(await geniusWrap(u));
  flushGeniusCache();
  return out;
}

export function flushGeniusCache() {
  if (dirty) { writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); dirty = false; }
}
