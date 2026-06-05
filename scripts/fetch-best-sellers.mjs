#!/usr/bin/env node
// Pull Amazon Best Sellers (Real-Time Amazon Data on RapidAPI) for one category
// and write a JSON cache the home "Best Sellers" strip reads. Keeps the previous
// good cache if the API call fails or returns nothing (never empties the strip).
//
//   node scripts/fetch-best-sellers.mjs [--category=electronics] [--limit=12]
//
// Env (from .env.local): RAPIDAPI_KEY, BESTSELLERS_CATEGORY, NEXT_PUBLIC_AMAZON_AFFILIATE_TAG
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// minimal .env.local loader
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]) ?? d;
const KEY = process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_AMAZON_KEY;
const HOST = 'real-time-amazon-data.p.rapidapi.com';
const CATEGORY = arg('category', process.env.BESTSELLERS_CATEGORY || 'electronics');
const LIMIT = parseInt(arg('limit', process.env.BESTSELLERS_LIMIT || '30'), 10);
const TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || '';
const OUT = join(ROOT, 'data', 'best-sellers.json');

if (!KEY) { console.error('RAPIDAPI_KEY not set in .env.local — aborting (cache untouched).'); process.exit(1); }

function num(v) { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; }

function affiliateUrl(asin, productUrl) {
  if (asin) {
    const base = `https://www.amazon.com/dp/${asin}`;
    return TAG ? `${base}?tag=${TAG}` : base;
  }
  if (!productUrl) return '';
  if (!TAG) return productUrl;
  return productUrl + (productUrl.includes('?') ? '&' : '?') + `tag=${TAG}`;
}

async function fetchPage(page) {
  const url = `https://${HOST}/best-sellers?category=${encodeURIComponent(CATEGORY)}&type=BEST_SELLERS&page=${page}&country=US`;
  const res = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } });
  if (!res.ok) throw new Error(`API HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const json = await res.json();
  // tolerate shape variants: data.best_sellers[] | data.products[] | best_sellers[]
  return json?.data?.best_sellers || json?.data?.products || json?.best_sellers || [];
}

async function main() {
  // Pull across pages until we have LIMIT items (each page is one API call; capped at 5).
  const raw = [];
  for (let page = 1; raw.length < LIMIT && page <= 5; page++) {
    let pageItems;
    try { pageItems = await fetchPage(page); }
    catch (e) { if (page === 1) throw e; console.error(`page ${page} failed: ${e.message}`); break; }
    if (!pageItems.length) break;
    raw.push(...pageItems);
  }
  const items = raw.slice(0, LIMIT).map((p, i) => ({
    rank: p.rank ?? p.product_rank ?? i + 1,
    asin: p.asin || p.product_asin || '',
    title: p.product_title || p.title || '',
    price: p.product_price || p.price || null,
    priceValue: num(p.product_price || p.price),
    image: p.product_photo || p.image || p.product_image || '',
    rating: num(p.product_star_rating || p.rating),
    ratingCount: num(p.product_num_ratings || p.ratings_total),
    url: affiliateUrl(p.asin || p.product_asin, p.product_url || p.url),
  })).filter((x) => x.title && x.image);

  if (!items.length) throw new Error('API returned 0 usable items (cache left as-is).');

  writeFileSync(OUT, JSON.stringify({ category: CATEGORY, capturedAt: new Date().toISOString(), items }, null, 2));
  console.log(`Wrote ${items.length} best sellers (${CATEGORY}) -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-best-sellers failed:', e.message); process.exit(1); });
