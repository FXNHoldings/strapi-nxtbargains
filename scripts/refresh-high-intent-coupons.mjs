#!/usr/bin/env node
// Refresh coupon caches only for the curated high-intent store list.
//
// Usage:
//   node scripts/refresh-high-intent-coupons.mjs --dry-run
//   node scripts/refresh-high-intent-coupons.mjs --limit=10
//   node scripts/refresh-high-intent-coupons.mjs --priority=1

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const STORE_LIST = join(ROOT, 'data', 'high-intent-coupon-stores.json');
const OUT = join(ROOT, 'data', 'coupon-store-coupons.json');
const HOST = process.env.RAPIDAPI_PROMO_CODES_HOST || 'get-promo-codes.p.rapidapi.com';
const KEY = process.env.RAPIDAPI_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = Number(arg('limit', '0')) || 0;
const PRIORITY = Number(arg('priority', '0')) || 0;
const DELAY_MS = Number(arg('delay-ms', '1100')) || 1100;

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function loadJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function recordsFrom(value) {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  for (const key of ['data', 'coupons', 'results', 'items', 'offers', 'records', 'list', 'deals']) {
    const nested = recordsFrom(value[key]);
    if (nested.length > 0) return nested;
  }
  return [];
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textField(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function absoluteHref(value, fallback) {
  if (!value) return fallback;
  return value.startsWith('http://') || value.startsWith('https://') ? value : fallback;
}

function couponFromRecord(record, store) {
  const title = textField(record, [
    'title',
    'description',
    'coupon_title',
    'couponTitle',
    'offer',
    'name',
    'product_title',
    'productTitle',
    'product_name',
  ]);
  if (!title) return null;

  const code = textField(record, ['code', 'coupon_code', 'couponCode', 'promo_code', 'promoCode', 'discount_code']);
  const discount = textField(record, [
    'discount',
    'discount_text',
    'discountText',
    'value',
    'saving',
    'savings',
    'percent_off',
    'percentOff',
  ]) || (code ? 'Promo code' : 'Coupon offer');
  const storeUrl = textField(record, ['url', 'link', 'store_url', 'storeUrl', 'website', 'domain']);
  const expires = textField(record, ['expires', 'expiry', 'expiry_date', 'expire_date', 'end_date', 'valid_till']);

  return {
    store: store.matchedName || store.label,
    title,
    code: code || undefined,
    discount,
    category: textField(record, ['category', 'category_name', 'categoryName', 'type']) || 'Promo codes',
    href: absoluteHref(storeUrl, `https://${store.domain}`),
    type: code ? 'Promo code' : 'Coupon',
    verified: expires ? `Expires ${expires}` : 'Recently updated',
    featured: Boolean(code),
  };
}

async function fetchCoupons(store) {
  const path = `/data/get-coupons/?page=1&sort=update_time_desc&store_id=${encodeURIComponent(store.storeId)}`;
  const res = await fetch(`https://${HOST}${path}`, {
    headers: {
      'x-rapidapi-host': HOST,
      'x-rapidapi-key': KEY,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const seen = new Set();
  return recordsFrom(json)
    .map((record) => couponFromRecord(record, store))
    .filter(Boolean)
    .filter((coupon) => {
      const key = `${coupon.store}|${coupon.code ?? ''}|${coupon.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 48);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const list = loadJson(STORE_LIST, { stores: [] });
  const existing = loadJson(OUT, { stores: {} });
  let stores = Array.isArray(list.stores) ? list.stores.filter((store) => store.status === 'active') : [];
  if (PRIORITY) stores = stores.filter((store) => Number(store.priority) === PRIORITY);
  if (LIMIT) stores = stores.slice(0, LIMIT);

  if (DRY_RUN) {
    console.log(`Would refresh ${stores.length} stores (${stores.length} RapidAPI requests):`);
    stores.forEach((store) => console.log(`${store.storeId}\t${store.label}\t${store.domain}\tpriority ${store.priority}`));
    return;
  }

  if (!KEY) {
    console.error('RAPIDAPI_KEY is required.');
    process.exit(1);
  }

  const cache = {
    source: 'RapidAPI high-intent coupon refresh',
    capturedAt: existing.capturedAt || null,
    stores: isRecord(existing.stores) ? existing.stores : {},
  };

  for (const [index, store] of stores.entries()) {
    try {
      const coupons = await fetchCoupons(store);
      cache.stores[String(store.storeId)] = {
        ...store,
        capturedAt: new Date().toISOString(),
        coupons,
      };
      cache.capturedAt = new Date().toISOString();
      writeFileSync(OUT, `${JSON.stringify(cache, null, 2)}\n`);
      console.log(`✓ ${index + 1}/${stores.length} ${store.label}: ${coupons.length} coupons`);
    } catch (error) {
      cache.stores[String(store.storeId)] = {
        ...store,
        capturedAt: new Date().toISOString(),
        coupons: cache.stores[String(store.storeId)]?.coupons ?? [],
        error: error instanceof Error ? error.message : String(error),
      };
      writeFileSync(OUT, `${JSON.stringify(cache, null, 2)}\n`);
      console.error(`✕ ${index + 1}/${stores.length} ${store.label}: ${cache.stores[String(store.storeId)].error}`);
    }
    if (index < stores.length - 1) await sleep(DELAY_MS);
  }
}

main().catch((error) => {
  console.error('refresh-high-intent-coupons failed:', error.message);
  process.exit(1);
});
