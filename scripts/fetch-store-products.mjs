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
//   node scripts/fetch-store-products.mjs --store=Amazon --out=best-sellers.json
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
const OUT_FILE = arg('out', `best-sellers-${storeKey}.json`);
const OUT = join(ROOT, 'data', OUT_FILE);

if (!STORE) { console.error('Pass --store="Target" (or "Best Buy", …) — aborting.'); process.exit(1); }
if (OUT_FILE.includes('/') || OUT_FILE.includes('\\')) { console.error('--out must be a filename, not a path.'); process.exit(1); }
if (!KEY) { console.error('RAPIDAPI_KEY not set in .env.local — aborting (cache untouched).'); process.exit(1); }

function num(v) { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; }
function money(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/[$€£]/.test(s)) return s;          // already formatted
  const n = num(s);
  return n != null ? `$${n}` : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const MARKETPLACE_HOSTS = {
  amazon: ['amazon.com', 'amzn.to'],
  bestbuy: ['bestbuy.com'],
  ebay: ['ebay.com'],
  target: ['target.com'],
  walmart: ['walmart.com'],
};

function parsedUrl(url) {
  try { return new URL(String(url || '')); } catch { return null; }
}

function isGoogleHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'googleadservices.com'
    || host.endsWith('.googleadservices.com')
    || host === 'shopping.google.com'
    || host.endsWith('.shopping.google.com')
    || /^google\.[a-z.]+$/.test(host)
    || /\.google\.[a-z.]+$/.test(host);
}

function isGoogleShoppingUrl(url) {
  const u = parsedUrl(url);
  if (!u) return false;
  if (!isGoogleHost(u.hostname)) return false;
  return u.hostname.includes('googleadservices')
    || u.hostname.includes('shopping.google')
    || ['/search', '/shopping', '/aclk', '/url'].some((path) => u.pathname.startsWith(path))
    || u.searchParams.get('tbm') === 'shop'
    || u.searchParams.get('udm') === '28'
    || u.searchParams.has('ibp');
}

function nestedMarketplaceUrl(url) {
  const u = parsedUrl(url);
  if (!u) return '';
  for (const key of ['url', 'u', 'q', 'adurl', 'target', 'redirect']) {
    const nested = u.searchParams.get(key);
    if (nested && /^https?:\/\//i.test(nested) && !isGoogleShoppingUrl(nested)) return nested;
  }
  return '';
}

function isStoreHost(url) {
  const u = parsedUrl(url);
  if (!u) return false;
  const hosts = MARKETPLACE_HOSTS[storeKey] || [];
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function cleanOfferUrl(url) {
  if (!url) return '';
  if (isGoogleShoppingUrl(url)) return nestedMarketplaceUrl(url);
  return String(url);
}

function marketplaceSearchUrl(title) {
  const q = encodeURIComponent(String(title || QUERY || STORE).trim());
  if (storeKey === 'amazon') return `https://www.amazon.com/s?k=${q}`;
  if (storeKey === 'bestbuy') return `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`;
  if (storeKey === 'ebay') return `https://www.ebay.com/sch/i.html?_nkw=${q}`;
  if (storeKey === 'target') return `https://www.target.com/s?searchTerm=${q}`;
  if (storeKey === 'walmart') return `https://www.walmart.com/search?q=${q}`;
  return '';
}

function directOfferForStore(offers) {
  const wanted = normalize(STORE);
  const sameStore = offers.find((offer) => {
    const storeName = normalize(offer.store_name || offer.store || offer.source || '');
    const url = cleanOfferUrl(offer.offer_page_url || '');
    return url && isStoreHost(url) && (storeName.includes(wanted) || wanted.includes(storeName));
  });
  if (sameStore) return { ...sameStore, offer_page_url: cleanOfferUrl(sameStore.offer_page_url) };

  const hostMatched = offers.find((offer) => isStoreHost(cleanOfferUrl(offer.offer_page_url || '')));
  return hostMatched ? { ...hostMatched, offer_page_url: cleanOfferUrl(hostMatched.offer_page_url) } : null;
}

async function offersForProduct(productId) {
  if (!productId) return [];
  const url = `https://${HOST}/product-offers-v2?product_id=${encodeURIComponent(productId)}&country=us&language=en&limit=20`;
  const res = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } });
  if (!res.ok) return [];
  return (await res.json())?.data?.offers || [];
}

async function main() {
  const url = `https://${HOST}/search-v2?q=${encodeURIComponent(QUERY)}&country=us&language=en&page=1&limit=${Math.min(LIMIT, 50)}&sort_by=BEST_MATCH&stores=${encodeURIComponent(STORE)}`;
  const res = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } });
  if (!res.ok) throw new Error(`API HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const json = await res.json();
  const products = json?.data?.products || [];

  const items = [];
  for (const p of products) {
    if (items.length >= LIMIT) break;
    const productId = p.product_id;
    const offers = await offersForProduct(productId);
    const o = directOfferForStore(offers);
    const fallbackUrl = marketplaceSearchUrl(p.product_title);
    if (!o) {
      if (!fallbackUrl) {
        console.warn(`Skipping ${p.product_title || productId}: no direct ${STORE} offer URL`);
        continue;
      }
      console.warn(`Using ${STORE} search fallback for ${p.product_title || productId}: no direct marketplace offer URL`);
    }
    items.push({
      rank: items.length + 1,
      id: String(productId || o?.offer_id || items.length),
      marketplace: storeKey,
      title: p.product_title || o?.offer_title || '',
      price: money(o?.price),
      priceValue: num(o?.price),
      image: (Array.isArray(p.product_photos) ? p.product_photos[0] : p.product_photo) || '',
      rating: num(p.product_rating),
      ratingCount: num(p.product_num_reviews),
      url: o?.offer_page_url || fallbackUrl,
    });
    await sleep(200);
  }

  const usableItems = items.filter((x) => x.title && x.image && x.url && !isGoogleShoppingUrl(x.url));
  if (!usableItems.length) throw new Error(`${STORE} returned 0 usable direct marketplace links (cache left as-is).`);

  // Monetise via GeniusLink (auto-affiliation); no-op if not configured.
  for (const it of usableItems) it.url = await geniusWrap(it.url);
  flushGeniusCache();

  writeFileSync(OUT, JSON.stringify({ marketplace: storeKey, store: STORE, query: QUERY, capturedAt: new Date().toISOString(), items: usableItems }, null, 2));
  console.log(`Wrote ${usableItems.length} ${STORE} products (q="${QUERY}") -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-store-products failed:', e.message); process.exit(1); });
