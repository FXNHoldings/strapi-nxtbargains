#!/usr/bin/env node
// Fetch the full RapidAPI promo-code store directory and cache it locally for
// /coupons/stores. The API returns 100 stores per page, so the current full
// directory is about 187 requests.
//
//   node scripts/fetch-coupon-stores.mjs
//   node scripts/fetch-coupon-stores.mjs --limit-pages=5
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const arg = (key, fallback = '') => process.argv.find((a) => a.startsWith(`--${key}=`))?.split('=')[1] ?? fallback;
const HOST = process.env.RAPIDAPI_PROMO_CODES_HOST || 'get-promo-codes.p.rapidapi.com';
const KEY = process.env.RAPIDAPI_KEY;
const OUT = join(ROOT, 'data', 'coupon-stores.json');
const PAGE_SIZE = 100;
const LIMIT_PAGES = Number(arg('limit-pages', '0'));
const DELAY_MS = Number(arg('delay-ms', '1200'));
const RETRY_DELAY_MS = Number(arg('retry-delay-ms', '65000'));
const RESUME = arg('resume', 'true') !== 'false';

if (!KEY) {
  console.error('RAPIDAPI_KEY not set in .env.local — aborting.');
  process.exit(1);
}

async function fetchPage(page) {
  const res = await fetch(`https://${HOST}/data/get-stores/?page=${page}`, {
    headers: {
      'x-rapidapi-host': HOST,
      'x-rapidapi-key': KEY,
    },
  });
  if (res.status === 429) {
    throw new Error('RATE_LIMIT');
  }
  if (!res.ok) throw new Error(`Store page ${page} HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPageWithRetry(page) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchPage(page);
    } catch (error) {
      if (error.message !== 'RATE_LIMIT' || attempt === 3) throw error;
      console.log(`Rate limited on page ${page}; waiting ${Math.round(RETRY_DELAY_MS / 1000)}s before retry ${attempt + 1}/3`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(`Store page ${page} failed after retries`);
}

function normalizeStore(record) {
  return {
    id: Number(record.store_id ?? record.id),
    name: String(record.store_name ?? record.name ?? '').trim(),
    url: String(record.url ?? '').trim(),
    domain: String(record.domain ?? '').trim(),
    logo: String(record.logo ?? '').trim(),
    country: String(record.country ?? '').trim(),
  };
}

async function main() {
  const existing = RESUME && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const existingStores = Array.isArray(existing?.stores) ? existing.stores : [];
  const stores = [...existingStores];
  const seenExisting = new Set(stores.map((store) => Number(store.id)));
  const first = await fetchPageWithRetry(1);
  const total = Number(first.total ?? 0);
  const pageCount = LIMIT_PAGES > 0 ? Math.min(LIMIT_PAGES, Math.ceil(total / PAGE_SIZE)) : Math.ceil(total / PAGE_SIZE);
  const firstStores = (Array.isArray(first.data) ? first.data : []).map(normalizeStore).filter((s) => s.id && s.name);
  for (const store of firstStores) {
    if (seenExisting.has(store.id)) continue;
    seenExisting.add(store.id);
    stores.push(store);
  }

  console.log(`Page 1/${pageCount}: ${stores.length} stores (${total} total reported)`);
  writeCache(stores, total, 1);
  for (let page = 2; page <= pageCount; page++) {
    if (stores.length >= page * PAGE_SIZE) continue;
    await sleep(DELAY_MS);
    const data = await fetchPageWithRetry(page);
    const items = (Array.isArray(data.data) ? data.data : []).map(normalizeStore).filter((s) => s.id && s.name);
    for (const store of items) {
      if (seenExisting.has(store.id)) continue;
      seenExisting.add(store.id);
      stores.push(store);
    }
    writeCache(stores, total, page);
    if (page % 10 === 0 || page === pageCount) console.log(`Page ${page}/${pageCount}: ${stores.length} stores cached`);
  }

  const seen = new Set();
  const unique = stores.filter((store) => {
    if (seen.has(store.id)) return false;
    seen.add(store.id);
    return true;
  });

  writeCache(unique, total, pageCount);
  console.log(`Wrote ${unique.length} stores -> ${OUT}`);
}

function writeCache(stores, total, pagesFetched) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    source: 'rapidapi:get-promo-codes',
    capturedAt: new Date().toISOString(),
    total,
    pageSize: PAGE_SIZE,
    pagesFetched,
    stores,
  }, null, 2));
}

main().catch((error) => {
  console.error('fetch-coupon-stores failed:', error.message);
  process.exit(1);
});
