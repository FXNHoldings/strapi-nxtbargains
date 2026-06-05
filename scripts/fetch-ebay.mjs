#!/usr/bin/env node
// Pull top eBay products (Buy Browse API · item_summary/search, default Best
// Match ranking) for one category and write a JSON cache the home "Best
// Sellers" eBay tab reads. eBay's true best-seller feed (Marketing API
// getMerchandisedProducts) needs a separate Buy-API access grant most accounts
// don't have, so this uses Browse search — top/popular items, not a strict
// sales chart. Keeps the previous good cache if the call fails or is empty.
//
//   node scripts/fetch-ebay.mjs [--category=293] [--query=laptop] [--limit=30]
//
// Env (.env.local):
//   EBAY_CLIENT_ID       eBay App ID  (Client ID)        [required]
//   EBAY_CLIENT_SECRET   eBay Cert ID (Client Secret)    [required]
//   EBAY_CATEGORY_ID     category id (default 293 = Consumer Electronics)
//   EBAY_QUERY           optional keyword to narrow the category
//   EBAY_MARKETPLACE_ID  default EBAY_US
//   EBAY_EPN_CAMPAIGN_ID optional EPN campaign id → affiliate item links
//   EBAY_ENV             production (default) | sandbox
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]) ?? d;
const CLIENT_ID = process.env.EBAY_CLIENT_ID;
const CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const CATEGORY = arg('category', process.env.EBAY_CATEGORY_ID || '293');
const QUERY = arg('query', process.env.EBAY_QUERY || '');
const MARKETPLACE = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
const CAMPAIGN = process.env.EBAY_EPN_CAMPAIGN_ID || '';
const LIMIT = parseInt(arg('limit', process.env.BESTSELLERS_LIMIT || '30'), 10);
const SANDBOX = (process.env.EBAY_ENV || 'production').toLowerCase() === 'sandbox';
const HOST = SANDBOX ? 'api.sandbox.ebay.com' : 'api.ebay.com';
const OUT = join(ROOT, 'data', 'best-sellers-ebay.json');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not set in .env.local — aborting (cache untouched).');
  process.exit(1);
}

function num(v) { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; }

function money(price) {
  if (!price) return null;
  const v = num(price.value);
  if (v === null) return null;
  const cur = price.currency || 'USD';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(v); }
  catch { return `${cur} ${v}`; }
}

async function token() {
  const res = await fetch(`https://${HOST}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  });
  if (!res.ok) throw new Error(`oauth HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return (await res.json()).access_token;
}

async function main() {
  const access = await token();
  const qs = new URLSearchParams({
    limit: String(Math.min(LIMIT, 200)),
    filter: 'buyingOptions:{FIXED_PRICE}',
  });
  if (CATEGORY) qs.set('category_ids', CATEGORY);
  if (QUERY) qs.set('q', QUERY);

  const headers = {
    Authorization: `Bearer ${access}`,
    'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
    Accept: 'application/json',
  };
  if (CAMPAIGN) headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${CAMPAIGN}`;

  const res = await fetch(`https://${HOST}/buy/browse/v1/item_summary/search?${qs}`, { headers });
  if (!res.ok) throw new Error(`browse search HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  const json = await res.json();
  const raw = json?.itemSummaries || [];

  const items = raw.slice(0, LIMIT).map((p, i) => ({
    rank: i + 1,
    id: p.itemId || p.legacyItemId || '',
    marketplace: 'ebay',
    title: p.title || '',
    price: money(p.price),
    priceValue: num(p.price?.value),
    image: p.image?.imageUrl || p.thumbnailImages?.[0]?.imageUrl || '',
    rating: null,
    ratingCount: null,
    url: p.itemAffiliateWebUrl || p.itemWebUrl || '',
  })).filter((x) => x.title && x.image && x.url);

  if (!items.length) throw new Error('eBay returned 0 usable items (cache left as-is).');

  writeFileSync(OUT, JSON.stringify({ marketplace: 'ebay', category: CATEGORY, query: QUERY || null, capturedAt: new Date().toISOString(), items }, null, 2));
  console.log(`Wrote ${items.length} eBay items (cat ${CATEGORY}${QUERY ? `, q="${QUERY}"` : ''}) -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-ebay failed:', e.message); process.exit(1); });
