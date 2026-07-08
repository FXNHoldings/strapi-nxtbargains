#!/usr/bin/env node
// Fetch the Amazon Promo Codes And Deals RapidAPI feed once and cache it for
// /coupons/amazon. This API has a low daily quota, so the page reads this cache
// instead of calling RapidAPI during render/build.
//
//   node scripts/fetch-amazon-coupons.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const HOST = process.env.RAPIDAPI_AMAZON_DEALS_HOST || 'amazon-promo-codes-and-deals.p.rapidapi.com';
const PATH = process.env.RAPIDAPI_AMAZON_DEALS_PATH || '/deals.php?limit=20&offset=0&merchant=Amazon&condition=New';
const KEY = process.env.RAPIDAPI_AMAZON_DEALS_KEY || process.env.RAPIDAPI_KEY;
const OUT = join(ROOT, 'data', 'amazon-coupons.json');

if (!KEY) {
  console.error('RAPIDAPI_AMAZON_DEALS_KEY or RAPIDAPI_KEY not set in .env.local — aborting.');
  process.exit(1);
}

async function main() {
  const res = await fetch(`https://${HOST}${PATH}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': HOST,
      'x-rapidapi-key': KEY,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Amazon deals HTTP ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const deals = Array.isArray(json.deals) ? json.deals.length : 0;
  if (deals === 0) throw new Error('Amazon deals API returned 0 deals; cache left untouched.');

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    source: 'rapidapi:amazon-promo-codes-and-deals',
    capturedAt: new Date().toISOString(),
    host: HOST,
    path: PATH,
    data: json,
  }, null, 2));
  console.log(`Wrote ${deals} Amazon deals -> ${OUT}`);
}

main().catch((error) => {
  console.error('fetch-amazon-coupons failed:', error.message);
  process.exit(1);
});
