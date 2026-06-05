#!/usr/bin/env node
// Pull Walmart products via Impact.com (Impact Radius) Catalog Item Search and
// write a JSON cache the home "Best Sellers" Walmart tab reads. Impact has no
// best-seller ranking, so this surfaces top results for a popular query (the
// Walmart tab is "popular picks", not a strict bestseller chart).
// Keeps the previous good cache if the API call fails or returns nothing.
//
//   node scripts/fetch-walmart.mjs [--query=electronics] [--limit=30]
//
// Env (.env.local):
//   IMPACT_ACCOUNT_SID        Impact Mediapartner Account SID   [required]
//   IMPACT_AUTH_TOKEN         Impact Auth Token                 [required]
//   IMPACT_WALMART_CATALOG_ID restrict to the Walmart catalog (preferred)
//   IMPACT_WALMART_CAMPAIGN_ID filter ItemSearch to Walmart program (fallback)
//   WALMART_QUERY             default search term (default "electronics")
//   IMPACT_TRACKING_TEMPLATE  optional deep-link template; "{url}" is replaced
//                             by the URL-encoded product link (affiliate wrap)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]) ?? d;
const SID = process.env.IMPACT_ACCOUNT_SID;
const TOKEN = process.env.IMPACT_AUTH_TOKEN;
const CATALOG = process.env.IMPACT_WALMART_CATALOG_ID || '';
const CAMPAIGN = process.env.IMPACT_WALMART_CAMPAIGN_ID || '';
const QUERY = arg('query', process.env.WALMART_QUERY || 'electronics');
const LIMIT = parseInt(arg('limit', process.env.BESTSELLERS_LIMIT || '30'), 10);
const TEMPLATE = process.env.IMPACT_TRACKING_TEMPLATE || '';
const OUT = join(ROOT, 'data', 'best-sellers-walmart.json');

if (!SID || !TOKEN) {
  console.error('IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN not set in .env.local — aborting (cache untouched).');
  process.exit(1);
}

function num(v) { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; }

function money(value, currency = 'USD') {
  const v = num(value);
  if (v === null) return null;
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v); }
  catch { return `${currency} ${v}`; }
}

function trackingUrl(productUrl) {
  if (!productUrl) return '';
  if (!TEMPLATE) return productUrl;
  return TEMPLATE.replace('{url}', encodeURIComponent(productUrl));
}

async function main() {
  const base = `https://api.impact.com/Mediapartners/${SID}`;
  const params = new URLSearchParams({ PageSize: String(Math.min(LIMIT, 100)), Page: '1' });
  let url;
  if (CATALOG) {
    // Catalog Items: `Query` here is an Impact filter EXPRESSION (e.g.
    // `Name CONTAINS "x"`), NOT a free-text keyword — a bare word 400s. Only
    // forward WALMART_QUERY when it looks like an expression (has a space);
    // otherwise just take the top N items from the Walmart catalog.
    if (QUERY && /\s/.test(QUERY)) params.set('Query', QUERY);
    url = `${base}/Catalogs/${CATALOG}/Items?${params}`;
  } else {
    // ItemSearch supports free-text keyword search across catalogs.
    if (QUERY) params.set('Query', QUERY);
    if (CAMPAIGN) params.set('CampaignId', CAMPAIGN);
    url = `${base}/Catalogs/ItemSearch?${params}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64'),
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Impact HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  const json = await res.json();
  const raw = json?.Items || json?.items || [];

  const items = raw.slice(0, LIMIT).map((p, i) => ({
    rank: i + 1,
    id: String(p.CatalogItemId ?? p.Id ?? p.Sku ?? i),
    marketplace: 'walmart',
    title: p.Name || p.Title || '',
    price: money(p.CurrentPrice ?? p.Price, p.Currency || 'USD'),
    priceValue: num(p.CurrentPrice ?? p.Price),
    image: p.ImageUrl || p.Image || '',
    rating: null,
    ratingCount: null,
    url: trackingUrl(p.TrackingLink || p.Url || p.ProductUrl),
  })).filter((x) => x.title && x.image);

  if (!items.length) throw new Error('Impact/Walmart returned 0 usable items (cache left as-is).');

  writeFileSync(OUT, JSON.stringify({ marketplace: 'walmart', query: QUERY, capturedAt: new Date().toISOString(), items }, null, 2));
  console.log(`Wrote ${items.length} Walmart items (query "${QUERY}") -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-walmart failed:', e.message); process.exit(1); });
