#!/usr/bin/env node
// Pull Amazon product picks from the Real-Time Product Search API
// (letscrape / RapidAPI) and write data/best-sellers.json for
// /best-sellers/amazon. With --categories, the cache includes per-item
// category/categoryLabel fields so the storefront renders category sections.
//
//   node scripts/fetch-best-sellers.mjs
//   node scripts/fetch-best-sellers.mjs --query="amazon best sellers electronics" --limit=30
//   node scripts/fetch-best-sellers.mjs --categories --limit=8
//   node scripts/fetch-best-sellers.mjs --categories --total=50
//
// Env (from .env.local): RAPIDAPI_KEY, NEXT_PUBLIC_AMAZON_AFFILIATE_TAG
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geniusWrap, flushGeniusCache } from './lib/geniuslink.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnv(join(ROOT, '.env.local'));

const arg = (key, fallback = '') => process.argv.find((item) => item.startsWith(`--${key}=`))?.split('=').slice(1).join('=') ?? fallback;
const hasFlag = (key) => process.argv.includes(`--${key}`);
const KEY = process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_AMAZON_KEY || process.env.RAPIDAPI_PRODUCT_SEARCH_KEY || '';
const HOST = process.env.REAL_TIME_PRODUCT_SEARCH_HOST || 'real-time-product-search.p.rapidapi.com';
const COUNTRY = arg('country', process.env.BESTSELLERS_COUNTRY || 'us');
const LANGUAGE = arg('language', process.env.BESTSELLERS_LANGUAGE || 'en');
const QUERY = arg('query', process.env.BESTSELLERS_QUERY || 'amazon best sellers electronics');
const CATEGORY = arg('category', process.env.BESTSELLERS_CATEGORY || 'electronics');
const USE_CATEGORIES = hasFlag('categories') || process.env.AMAZON_BESTSELLERS_BY_CATEGORY === 'true';
const LIMIT = positiveInt(arg('limit', process.env.BESTSELLERS_LIMIT || '30'), 30);
const TOTAL = positiveInt(arg('total', process.env.BESTSELLERS_TOTAL || ''), 0);
const OFFER_LIMIT = positiveInt(arg('offer-limit', process.env.BESTSELLERS_OFFER_LIMIT || '20'), 20);
const TIMEOUT_MS = positiveInt(arg('timeout', process.env.BESTSELLERS_TIMEOUT_MS || '20000'), 20000);
const TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || process.env.AMAZON_AFFILIATE_TAG || '';
const OUT = join(ROOT, 'data', 'best-sellers.json');

const CATEGORY_CONFIG = [
  { key: 'smart-phones', label: 'Smart Phones', query: 'amazon best sellers unlocked smartphones' },
  { key: 'laptops', label: 'Laptops', query: 'amazon best sellers laptops' },
  { key: 'tablets', label: 'Tablets', query: 'amazon best sellers tablets' },
  { key: 'smartwatches', label: 'Smartwatches', query: 'amazon best sellers smartwatches' },
  { key: 'headphones', label: 'Headphones', query: 'amazon best sellers headphones earbuds' },
  { key: 'smart-tvs', label: 'Smart TVs', query: 'amazon best sellers smart tvs' },
];

if (!KEY) {
  console.error('Set RAPIDAPI_KEY, RAPIDAPI_AMAZON_KEY, or RAPIDAPI_PRODUCT_SEARCH_KEY in .env.local.');
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

function numericValue(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function money(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (/[$€£]/.test(text)) return text;
  const number = numericValue(text);
  return number !== null ? `$${number}` : null;
}

function imageFor(product) {
  if (Array.isArray(product.product_photos) && product.product_photos[0]) return product.product_photos[0];
  return product.product_photo || product.thumbnail || '';
}

function asinFromUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const match = url.pathname.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
    return match?.[1]?.toUpperCase() || '';
  } catch {
    return '';
  }
}

function affiliateUrl(asin, productUrl) {
  const url = asin ? `https://www.amazon.com/dp/${asin}` : productUrl;
  if (!url) return '';
  if (!TAG || url.includes('tag=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}tag=${encodeURIComponent(TAG)}`;
}

function isAmazonHost(url) {
  try {
    const host = new URL(String(url || '')).hostname.toLowerCase().replace(/^www\./, '');
    return host === 'amazon.com' || host.endsWith('.amazon.com') || host === 'amzn.to';
  } catch {
    return false;
  }
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

function amazonSearchUrl(title) {
  const query = encodeURIComponent(String(title || QUERY).trim());
  return `https://www.amazon.com/s?k=${query}`;
}

async function rapid(path, params) {
  const url = new URL(`https://${HOST}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': KEY,
      'X-RapidAPI-Host': HOST,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function search(query, limit) {
  const payload = await rapid('/search-v2', {
    q: query,
    country: COUNTRY,
    language: LANGUAGE,
    page: 1,
    limit: Math.min(limit, 50),
    sort_by: 'BEST_MATCH',
    stores: 'Amazon',
  });
  return Array.isArray(payload?.data?.products) ? payload.data.products : [];
}

async function offersForProduct(productId) {
  if (!productId) return [];
  const payload = await rapid('/product-offers-v2', {
    product_id: productId,
    country: COUNTRY,
    language: LANGUAGE,
    limit: OFFER_LIMIT,
  });
  return Array.isArray(payload?.data?.offers) ? payload.data.offers : [];
}

function amazonOffer(offers) {
  return offers.find((offer) => isAmazonHost(offer.offer_page_url) && !isGoogleShoppingUrl(offer.offer_page_url))
    ?? offers.find((offer) => String(offer.store_name || '').toLowerCase().includes('amazon') && offer.offer_page_url && !isGoogleShoppingUrl(offer.offer_page_url))
    ?? null;
}

async function mapProduct(product, index, category) {
  let offer = null;
  try {
    offer = amazonOffer(await offersForProduct(product.product_id));
  } catch (error) {
    console.warn(`offers skipped for ${product.product_title || product.product_id}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const offerUrl = offer?.offer_page_url || product.product_page_url || '';
  const asin = product.asin || product.product_asin || asinFromUrl(offerUrl);
  const rawUrl = affiliateUrl(asin, isAmazonHost(offerUrl) ? offerUrl : amazonSearchUrl(product.product_title));

  return {
    rank: index + 1,
    asin,
    id: String(product.product_id || asin || index + 1),
    marketplace: 'amazon',
    category: category.key,
    categoryLabel: category.label,
    title: product.product_title || offer?.offer_title || '',
    price: money(offer?.price ?? product.price),
    priceValue: numericValue(offer?.price ?? product.price),
    image: imageFor(product),
    rating: numericValue(product.product_rating),
    ratingCount: numericValue(product.product_num_reviews),
    url: await geniusWrap(rawUrl),
    badge: offer?.on_sale ? 'Deal' : null,
    badges: [offer?.on_sale ? 'Deal' : null, offer?.shipping, offer?.product_condition].filter(Boolean).slice(0, 4),
    source: 'real-time-product-search',
  };
}

async function fetchProductsForCategory(category, limit) {
  const products = await search(category.query, limit);
  const items = [];
  for (const product of products) {
    if (items.length >= limit) break;
    const item = await mapProduct(product, items.length, category);
    if (item.title && item.image && item.url) items.push(item);
  }
  return items;
}

async function main() {
  const categories = USE_CATEGORIES
    ? CATEGORY_CONFIG
    : [{ key: CATEGORY, label: CATEGORY, query: QUERY }];
  const perCategoryLimit = USE_CATEGORIES && TOTAL
    ? Math.max(1, Math.ceil(TOTAL / categories.length))
    : LIMIT;

  const items = [];
  for (const category of categories) {
    try {
      if (TOTAL && items.length >= TOTAL) break;
      const remaining = TOTAL ? TOTAL - items.length : perCategoryLimit;
      const categoryItems = await fetchProductsForCategory(category, Math.min(perCategoryLimit, remaining));
      console.log(`Fetched ${categoryItems.length} Amazon products for ${category.label}`);
      items.push(...categoryItems);
    } catch (error) {
      console.warn(`category skipped for ${category.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  flushGeniusCache();

  if (!items.length) throw new Error('Real-Time Product Search returned 0 usable Amazon products; cache left untouched.');

  writeFileSync(OUT, `${JSON.stringify({
    marketplace: 'amazon',
    category: USE_CATEGORIES ? 'multiple' : CATEGORY,
    categories: USE_CATEGORIES ? CATEGORY_CONFIG : undefined,
    query: USE_CATEGORIES ? 'multiple Amazon category queries' : QUERY,
    source: 'real-time-product-search',
    capturedAt: new Date().toISOString(),
    items: TOTAL ? items.slice(0, TOTAL) : items,
  }, null, 2)}\n`);

  console.log(`Wrote ${TOTAL ? Math.min(items.length, TOTAL) : items.length} Amazon best sellers -> ${OUT}`);
}

main().catch((error) => {
  console.error('fetch-best-sellers failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
