#!/usr/bin/env node
// Pull top products for ONE store (Target, Best Buy, …) from the Real-Time
// Product Search API (letscrape / RapidAPI, /search-v2 with a stores= filter)
// and write a JSON cache a home "Best Sellers" tab reads. Not a literal sales
// chart — it's top BEST_MATCH results for a query, available at that store
// (same spirit as the eBay/Walmart tabs). Keeps the previous good cache on
// failure / empty.
//
//   node scripts/fetch-store-products.mjs --store=Target [--query=electronics] [--limit=30]
//   node scripts/fetch-store-products.mjs --store="Best Buy"
//
// Env (.env.local): RAPIDAPI_KEY, optional <KEY>_QUERY (e.g. TARGET_QUERY)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { geniusWrap, flushGeniusCache } from './lib/geniuslink.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]) ?? d;
const KEY = process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_AMAZON_KEY;
const HOST = 'real-time-product-search.p.rapidapi.com';
const STORE = arg('store', '');
const storeKey = STORE.toLowerCase().replace(/[^a-z0-9]+/g, ''); // "Best Buy" -> "bestbuy"
const QUERY = arg('query', process.env[`${storeKey.toUpperCase()}_QUERY`] || process.env.STORE_QUERY || 'best sellers');
const LIMIT = parseInt(arg('limit', process.env.BESTSELLERS_LIMIT || '30'), 10);
const OUT = join(ROOT, 'data', `best-sellers-${storeKey}.json`);

if (!STORE) { console.error('Pass --store="Target" (or "Best Buy", …) — aborting.'); process.exit(1); }
if (!KEY) { console.error('RAPIDAPI_KEY not set in .env.local — aborting (cache untouched).'); process.exit(1); }

function num(v) { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; }
function money(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/[$€£]/.test(s)) return s;          // already formatted
  const n = num(s);
  return n != null ? `$${n}` : null;
}

async function main() {
  const url = `https://${HOST}/search-v2?q=${encodeURIComponent(QUERY)}&country=us&language=en&page=1&limit=${Math.min(LIMIT, 50)}&sort_by=BEST_MATCH&stores=${encodeURIComponent(STORE)}`;
  const res = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } });
  if (!res.ok) throw new Error(`API HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const json = await res.json();
  const products = json?.data?.products || [];

  const items = products.slice(0, LIMIT).map((p, i) => {
    const o = p.offer || {};
    return {
      rank: i + 1,
      id: String(p.product_id || o.offer_id || i),
      marketplace: storeKey,
      title: p.product_title || o.offer_title || '',
      price: money(o.price),
      priceValue: num(o.price),
      image: (Array.isArray(p.product_photos) ? p.product_photos[0] : p.product_photo) || '',
      rating: num(p.product_rating),
      ratingCount: num(p.product_num_reviews),
      url: o.offer_page_url || p.product_page_url || '',
    };
  }).filter((x) => x.title && x.image && x.url);

  if (!items.length) throw new Error(`${STORE} returned 0 usable items (cache left as-is).`);

  // Monetise via GeniusLink (auto-affiliation); no-op if not configured.
  for (const it of items) it.url = await geniusWrap(it.url);
  flushGeniusCache();

  writeFileSync(OUT, JSON.stringify({ marketplace: storeKey, store: STORE, query: QUERY, capturedAt: new Date().toISOString(), items }, null, 2));
  console.log(`Wrote ${items.length} ${STORE} products (q="${QUERY}") -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-store-products failed:', e.message); process.exit(1); });
