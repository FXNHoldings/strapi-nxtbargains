#!/usr/bin/env node
// Pull Awin voucher codes + promotions and write a JSON cache the /coupons page
// reads. IMPORTANT: Awin's REST API (api.awin.com, the OAuth2-token API) does
// NOT expose voucher data — it only covers programmes/transactions/reports.
// Voucher codes come from a "Promotions" feed you generate in the Awin UI via
// Create-a-Feed (Toolbox → Create-a-Feed → Promotional data). Paste that feed's
// download URL into AWIN_PROMOTIONS_FEED_URL. The feed can be CSV or JSON; this
// parses both, mapping columns by fuzzy header match. Keeps the previous good
// cache if the fetch fails or returns nothing.
//
//   node scripts/fetch-coupons-awin.mjs [--limit=200]
//
// Env (.env.local):
//   AWIN_PROMOTIONS_FEED_URL  Create-a-Feed promotions feed URL   [required]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]) ?? d;
const FEED = process.env.AWIN_PROMOTIONS_FEED_URL;
const LIMIT = parseInt(arg('limit', process.env.COUPONS_LIMIT || '200'), 10);
const OUT = join(ROOT, 'data', 'coupons-awin.json');

if (!FEED) {
  console.error('AWIN_PROMOTIONS_FEED_URL not set in .env.local — aborting (cache untouched).');
  console.error('Generate it in Awin: Toolbox → Create-a-Feed → Promotional data, then paste the download URL.');
  process.exit(1);
}

// Minimal CSV row parser (handles quoted fields + embedded commas/quotes).
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const find = (obj, ...keys) => {
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase();
    if (keys.some((want) => lk.includes(want))) { const v = obj[k]; if (v != null && v !== '') return v; }
  }
  return null;
};

function toItem(r) {
  const code = find(r, 'vouchercode', 'voucher', 'code');
  return {
    network: 'awin',
    id: String(find(r, 'promotionid', 'id') ?? code ?? ''),
    merchant: find(r, 'advertisername', 'advertiser', 'merchant', 'programme', 'program') || '',
    merchantId: String(find(r, 'advertiserid', 'programmeid') ?? ''),
    title: find(r, 'title', 'name') || '',
    description: (find(r, 'description', 'terms') || '').toString().trim(),
    code: code || null,
    type: code ? 'voucher' : 'promotion',
    exclusive: /1|true|yes/i.test(String(find(r, 'exclusive') ?? '')),
    url: find(r, 'clickthroughurl', 'trackingurl', 'url', 'link', 'deeplink') || '',
    startsAt: find(r, 'startdate', 'validfrom', 'start'),
    endsAt: find(r, 'enddate', 'validto', 'end'),
  };
}

async function main() {
  const res = await fetch(FEED, { headers: { Accept: 'application/json, text/csv, */*' } });
  if (!res.ok) throw new Error(`Awin feed HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const text = await res.text();

  let records = [];
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const json = JSON.parse(trimmed);
    records = Array.isArray(json) ? json : (json.promotions ?? json.data ?? json.vouchers ?? []);
  } else {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('Awin feed had no data rows.');
    const headers = rows[0].map((h) => h.trim());
    records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  }

  const items = records.slice(0, LIMIT).map(toItem).filter((x) => x.merchant && x.title && x.url);
  if (!items.length) throw new Error('Awin feed returned 0 usable promotions (cache left as-is).');

  writeFileSync(OUT, JSON.stringify({ network: 'awin', capturedAt: new Date().toISOString(), items }, null, 2));
  const withCodes = items.filter((i) => i.code).length;
  console.log(`Wrote ${items.length} Awin promotions (${withCodes} with codes) -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-coupons-awin failed:', e.message); process.exit(1); });
