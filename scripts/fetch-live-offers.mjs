#!/usr/bin/env node
// Live multi-store price comparison for nxt-bargains products. For each product
// it resolves a catalog match via Real-Time Product Search (/search-v2, by GTIN
// then name), then pulls every store's offer (/product-offers-v2), and writes a
// cache the product page reads: data/live-offers.json keyed by product slug.
// 2 API calls per product, so use --limit and let cron cycle through. Raw offer
// URLs are stored as-is (GeniusLink wrapping is applied at render).
//
//   node scripts/fetch-live-offers.mjs [--limit=12] [--slug=foo]
//
// Env (.env.local): RAPIDAPI_KEY, NEXT_PUBLIC_STRAPI_URL, STRAPI_API_TOKEN
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
const KEY = process.env.RAPIDAPI_KEY;
const HOST = 'real-time-product-search.p.rapidapi.com';
const STRAPI = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN;
const TAG = process.env.NEXT_PUBLIC_SITE_PRODUCT_TAG || 'nxt-bargains';
const LIMIT = parseInt(arg('limit', process.env.LIVE_OFFERS_LIMIT || '12'), 10);
const ONLY_SLUG = arg('slug', '');
const OUT = join(ROOT, 'data', 'live-offers.json');

if (!KEY) { console.error('RAPIDAPI_KEY not set — aborting (cache untouched).'); process.exit(1); }
if (!TOKEN) { console.error('STRAPI_API_TOKEN not set — aborting (cache untouched).'); process.exit(1); }

const rapid = (path) => fetch(`https://${HOST}${path}`, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } });
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function strapiProducts() {
  const qs = new URLSearchParams();
  qs.set('filters[tags][$containsi]', TAG);
  qs.set('filters[productStatus][$eq]', 'active');
  ['slug', 'name', 'gtin', 'asin'].forEach((f, i) => qs.set(`fields[${i}]`, f));
  qs.set('sort[0]', 'updatedAt:desc');
  qs.set('pagination[pageSize]', '100');
  if (ONLY_SLUG) qs.set('filters[slug][$eq]', ONLY_SLUG);
  const res = await fetch(`${STRAPI}/api/commerce-products?${qs}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`Strapi ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return (await res.json()).data.map((p) => p.attributes ?? p);
}

async function resolveProductId(p) {
  const gtin = String(p.gtin ?? '').replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  for (const q of [gtin, p.asin, p.name].filter(Boolean)) {
    const r = await rapid(`/search-v2?q=${encodeURIComponent(q)}&country=us&language=en&limit=1`);
    if (!r.ok) continue;
    const id = (await r.json())?.data?.products?.[0]?.product_id;
    if (id) return id;
  }
  return null;
}

async function offersFor(productId) {
  const r = await rapid(`/product-offers-v2?product_id=${encodeURIComponent(productId)}&country=us&limit=20`);
  if (!r.ok) throw new Error(`offers HTTP ${r.status}`);
  const offers = (await r.json())?.data?.offers || [];
  return offers.map((o) => ({
    store: o.store_name || '',
    price: o.price || null,
    priceValue: num(o.price),
    originalPrice: o.original_price || null,
    onSale: Boolean(o.on_sale),
    condition: o.product_condition || null,
    favicon: o.store_favicon || null,
    url: o.offer_page_url || '',          // raw — GeniusLink-wrapped at render
  })).filter((o) => o.store && o.url && o.priceValue != null)
     .sort((a, b) => a.priceValue - b.priceValue)
     .slice(0, 12);
}

async function main() {
  const products = (await strapiProducts()).slice(0, LIMIT);
  const cache = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { items: {} };
  cache.items = cache.items || {};
  let ok = 0, miss = 0;
  for (const p of products) {
    try {
      const id = await resolveProductId(p);
      if (!id) { miss++; console.log(`?  ${p.name?.slice(0, 40)} — no catalog match`); continue; }
      const offers = await offersFor(id);
      if (!offers.length) { miss++; console.log(`–  ${p.name?.slice(0, 40)} — 0 offers`); continue; }
      for (const o of offers) o.url = await geniusWrap(o.url);   // GeniusLink affiliation
      cache.items[p.slug] = { name: p.name, productId: id, capturedAt: new Date().toISOString(), offers };
      ok++;
      console.log(`✓  ${p.name?.slice(0, 40)} — ${offers.length} stores (from $${offers[0].priceValue})`);
      await sleep(350);
    } catch (e) { miss++; console.error(`✖  ${p.name?.slice(0, 40)} — ${e.message}`); }
  }
  flushGeniusCache();
  cache.capturedAt = new Date().toISOString();
  writeFileSync(OUT, JSON.stringify(cache, null, 2));
  console.log(`\nDone. matched=${ok} missed=${miss} -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-live-offers failed:', e.message); process.exit(1); });
