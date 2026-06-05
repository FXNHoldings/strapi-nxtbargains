#!/usr/bin/env node
// Pull Tradedoubler voucher codes (Open Voucher API) for the programmes your
// publisher account is approved in, and write a JSON cache the /coupons page
// reads. Each voucher carries a clk.tradedoubler.com tracking link (a=<your
// publisher id>) so "Get code" buttons monetise automatically. Keeps the
// previous good cache if the call fails or returns nothing.
//
//   node scripts/fetch-coupons-tradedoubler.mjs [--limit=200]
//
// Env (.env.local):
//   TRADEDOUBLER_VOUCHER_TOKEN  the VOUCHERS token (Settings → Tokens)   [required]
//   TRADEDOUBLER_PUBLISHER_ID   your publisher id (e.g. 2471524)         [optional, label only]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]) ?? d;
const TOKEN = process.env.TRADEDOUBLER_VOUCHER_TOKEN;
const LIMIT = parseInt(arg('limit', process.env.COUPONS_LIMIT || '200'), 10);
const OUT = join(ROOT, 'data', 'coupons-tradedoubler.json');

if (!TOKEN) {
  console.error('TRADEDOUBLER_VOUCHER_TOKEN not set in .env.local — aborting (cache untouched).');
  process.exit(1);
}

function pick(...vals) { return vals.find((v) => v != null && v !== '') ?? null; }

function mapVoucher(v) {
  const program = v.program ?? v.advertiser ?? {};
  const code = pick(v.code, v.voucherCode, v.discountCode);
  return {
    network: 'tradedoubler',
    id: String(pick(v.id, v.voucherId, code) ?? ''),
    merchant: pick(program.name, v.programName, v.advertiserName, v.siteName) || '',
    merchantId: String(pick(program.id, v.programId, v.advertiserId) ?? ''),
    title: pick(v.title, v.name, v.shortDescription) || '',
    description: (pick(v.description, v.shortDescription, v.terms) || '').toString().trim(),
    code,
    type: code ? 'voucher' : 'promotion',
    exclusive: Boolean(v.exclusive),
    url: pick(v.trackUri, v.clkUri, v.trackingUrl, v.link, v.landingUrl) || '',
    startsAt: pick(v.startDate, v.validFrom),
    endsAt: pick(v.endDate, v.validTo),
  };
}

async function main() {
  // Open Voucher API. Token goes in the query string; ask for JSON explicitly.
  const url = `https://api.tradedoubler.com/1.0/vouchers?token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Tradedoubler HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  const json = await res.json();
  const raw = json?.vouchers ?? json?.items ?? (Array.isArray(json) ? json : []);

  const items = raw.slice(0, LIMIT).map(mapVoucher).filter((x) => x.merchant && x.title && x.url);

  if (!items.length) throw new Error('Tradedoubler returned 0 usable vouchers (cache left as-is). Are you approved in any programmes?');

  writeFileSync(OUT, JSON.stringify({ network: 'tradedoubler', capturedAt: new Date().toISOString(), items }, null, 2));
  const withCodes = items.filter((i) => i.code).length;
  console.log(`Wrote ${items.length} Tradedoubler vouchers (${withCodes} with codes) -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-coupons-tradedoubler failed:', e.message); process.exit(1); });
