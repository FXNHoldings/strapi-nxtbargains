#!/usr/bin/env node
// Fetch sale/deal products from Real-Time Product Search and cache them for
// /best-deals. Keeps the page fast and avoids calling RapidAPI at render time.
//
// Usage:
//   node scripts/fetch-real-time-best-deals.mjs
//   node scripts/fetch-real-time-best-deals.mjs --queries="laptop,smart tv,headphones" --total=36
//
// Env (.env.local): RAPIDAPI_KEY
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geniusWrap, flushGeniusCache } from './lib/geniuslink.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnv(join(ROOT, '.env.local'));

const arg = (key, fallback = '') => process.argv.find((item) => item.startsWith(`--${key}=`))?.split('=').slice(1).join('=') ?? fallback;
const KEY = process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_PRODUCT_SEARCH_KEY || '';
const HOST = process.env.REAL_TIME_PRODUCT_SEARCH_HOST || 'real-time-product-search.p.rapidapi.com';
const COUNTRY = arg('country', process.env.BEST_DEALS_COUNTRY || 'us');
const LANGUAGE = arg('language', process.env.BEST_DEALS_LANGUAGE || 'en');
const QUERIES = arg('queries', process.env.BEST_DEALS_QUERIES || 'laptop,smart tv,headphones,smartphone,tablet,amazon deals,best buy deals,walmart deals')
  .split(',')
  .map((query) => query.trim())
  .filter(Boolean);
const PER_QUERY = positiveInt(arg('per-query', process.env.BEST_DEALS_PER_QUERY || '12'), 12);
const TOTAL = positiveInt(arg('total', process.env.BEST_DEALS_TOTAL || '36'), 36);
const RESOLVE_LIMIT = positiveInt(arg('resolve-limit', process.env.BEST_DEALS_RESOLVE_LIMIT || '18'), 18);
const TIMEOUT_MS = positiveInt(arg('timeout', process.env.BEST_DEALS_TIMEOUT_MS || '20000'), 20000);
const OUT = join(ROOT, 'data', 'best-deals-realtime.json');

if (!KEY) {
  console.error('Set RAPIDAPI_KEY in .env.local.');
  process.exit(1);
}

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function moneyNumber(value) {
  if (isInstallmentValue(value)) return null;
  const match = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function isInstallmentValue(value) {
  const text = String(value ?? '').toLowerCase();
  return text.includes('/mo') || text.includes('per month') || /^\s*x\s*\d+/.test(text);
}

function percentNumber(value) {
  const match = String(value ?? '').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function imageFor(product) {
  if (Array.isArray(product.product_photos) && product.product_photos[0]) return product.product_photos[0];
  return product.product_photo || product.thumbnail || '';
}

function isGoogleShoppingUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    const host = parsed.hostname.toLowerCase();
    return host.includes('google.') || host.includes('googleadservices') || host.includes('shopping.google');
  } catch {
    return false;
  }
}

async function rapid(path) {
  const response = await fetch(`https://${HOST}${path}`, {
    headers: {
      'X-RapidAPI-Key': KEY,
      'X-RapidAPI-Host': HOST,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 180)}`);
  return JSON.parse(text);
}

async function search(query) {
  const params = new URLSearchParams({
    q: query,
    country: COUNTRY,
    language: LANGUAGE,
    page: '1',
    limit: String(Math.min(PER_QUERY, 50)),
    sort_by: 'BEST_MATCH',
  });
  const payload = await rapid(`/search-v2?${params}`);
  return Array.isArray(payload?.data?.products) ? payload.data.products : [];
}

async function offers(productId) {
  if (!productId) return [];
  const params = new URLSearchParams({
    product_id: productId,
    country: COUNTRY,
    language: LANGUAGE,
    limit: '20',
  });
  const payload = await rapid(`/product-offers-v2?${params}`);
  return Array.isArray(payload?.data?.offers) ? payload.data.offers : [];
}

function dealStats(product, offer = null) {
  const price = moneyNumber(offer?.price ?? product.price);
  const original = moneyNumber(offer?.original_price ?? product.original_price);
  const explicit = percentNumber(offer?.discount_percent ?? product.discount_percent);
  const calculated = price !== null && original !== null && original > price
    ? Math.round(((original - price) / original) * 100)
    : 0;
  const discount = Math.max(explicit ?? 0, calculated);
  const savings = price !== null && original !== null && original > price ? original - price : 0;
  return { price, original, discount, savings };
}

function bestOfferFor(product, offersList) {
  const wantedStore = String(product.store_name || '').toLowerCase();
  const usable = offersList
    .filter((offer) => offer?.offer_page_url && !isGoogleShoppingUrl(offer.offer_page_url))
    .map((offer) => ({ offer, stats: dealStats(product, offer) }))
    .filter(({ stats }) => stats.price !== null);

  const storeMatch = usable.find(({ offer }) => String(offer.store_name || '').toLowerCase().includes(wantedStore));
  if (storeMatch) return storeMatch.offer;

  const discounted = usable
    .filter(({ stats }) => stats.discount > 0 || stats.savings > 0)
    .sort((a, b) => b.stats.discount - a.stats.discount || b.stats.savings - a.stats.savings);
  if (discounted[0]) return discounted[0].offer;

  return usable.sort((a, b) => (a.stats.price ?? Infinity) - (b.stats.price ?? Infinity))[0]?.offer ?? null;
}

function mapDeal(product, query, offer = null) {
  if (
    isInstallmentValue(offer?.price ?? product.price)
    || isInstallmentValue(offer?.original_price ?? product.original_price)
  ) {
    return null;
  }

  const stats = dealStats(product, offer);
  if (stats.price === null || (stats.discount <= 0 && stats.savings <= 0 && !product.on_sale)) return null;

  const rawUrl = offer?.offer_page_url || product.product_page_url || '';
  if (!rawUrl) return null;

  return {
    id: String(product.product_id || product.product_page_url || product.product_title),
    productId: product.product_id || null,
    query,
    title: product.product_title || offer?.offer_title || '',
    store: offer?.store_name || product.store_name || 'Merchant',
    price: offer?.price || product.price || null,
    priceValue: stats.price,
    originalPrice: offer?.original_price || product.original_price || null,
    originalPriceValue: stats.original,
    discountPercent: stats.discount,
    savingsValue: stats.savings,
    image: imageFor(product),
    rating: moneyNumber(product.product_rating),
    ratingCount: moneyNumber(product.product_num_reviews),
    shipping: offer?.shipping || product.shipping || null,
    condition: offer?.product_condition || null,
    favicon: offer?.store_favicon || null,
    url: rawUrl,
    source: 'real-time-product-search',
  };
}

async function main() {
  const seen = new Set();
  const candidates = [];

  for (const query of QUERIES) {
    try {
      const products = await search(query);
      for (const product of products) {
        const key = String(product.product_id || product.product_title || '').toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        candidates.push({ product, query });
      }
      console.log(`search "${query}": ${products.length} products`);
    } catch (error) {
      console.warn(`search skipped "${query}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const mapped = [];
  for (const [index, candidate] of candidates.entries()) {
    let offer = null;
    if (index < RESOLVE_LIMIT) {
      try {
        offer = bestOfferFor(candidate.product, await offers(candidate.product.product_id));
      } catch (error) {
        console.warn(`offers skipped for ${candidate.product.product_title || candidate.product.product_id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const deal = mapDeal(candidate.product, candidate.query, offer);
    if (deal) mapped.push(deal);
  }

  const items = mapped
    .filter((item) => item.title && item.image && item.url)
    .sort((a, b) => b.discountPercent - a.discountPercent || b.savingsValue - a.savingsValue)
    .slice(0, TOTAL);

  if (!items.length) throw new Error('Real-Time Product Search returned 0 usable deals; cache left untouched.');

  for (const item of items) {
    if (!isGoogleShoppingUrl(item.url)) item.url = await geniusWrap(item.url);
  }
  flushGeniusCache();

  writeFileSync(OUT, `${JSON.stringify({
    source: 'real-time-product-search',
    capturedAt: new Date().toISOString(),
    queries: QUERIES,
    country: COUNTRY,
    language: LANGUAGE,
    items,
  }, null, 2)}\n`);

  console.log(`Wrote ${items.length} best deals -> ${OUT}`);
}

main().catch((error) => {
  console.error('fetch-real-time-best-deals failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
