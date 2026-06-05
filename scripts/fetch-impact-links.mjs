#!/usr/bin/env node
// Fetch every approved Impact campaign's deep-link tracking template and write
// data/impact-links.json keyed by advertiser slug. The product page wraps any
// matching merchant offer URL (e.g. a raw whatnot.com link) with the campaign's
// tracking link so it monetises via Impact — no per-merchant affiliate IDs in
// code. Re-run (cron) auto-picks-up new approvals (Whatnot, etc.) the moment
// they sync to the Impact API. Keeps the previous good cache on failure.
//
//   node scripts/fetch-impact-links.mjs
//
// Env (.env.local): IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
for (const line of (existsSync(join(ROOT, '.env.local')) ? readFileSync(join(ROOT, '.env.local'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SID = process.env.IMPACT_ACCOUNT_SID;
const TOK = process.env.IMPACT_AUTH_TOKEN;
const OUT = join(ROOT, 'data', 'impact-links.json');

if (!SID || !TOK) { console.error('IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN not set — aborting.'); process.exit(1); }

const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  const res = await fetch(`https://api.impact.com/Mediapartners/${SID}/Campaigns?PageSize=200`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${SID}:${TOK}`).toString('base64'), Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Impact HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const camps = (await res.json())?.Campaigns || [];

  const advertisers = {};
  for (const c of camps) {
    if (!c.TrackingLink) continue;
    const entry = {
      advertiser: c.AdvertiserName || c.CampaignName,
      campaignId: String(c.CampaignId ?? ''),
      trackingLink: c.TrackingLink,
      allowsDeeplinking: String(c.AllowsDeeplinking).toLowerCase() === 'true',
      deeplinkDomains: (Array.isArray(c.DeeplinkDomains) ? c.DeeplinkDomains : String(c.DeeplinkDomains || '').split(','))
        .map((d) => String(d).trim()).filter(Boolean),
    };
    advertisers[slugify(entry.advertiser)] = entry;
  }

  if (!Object.keys(advertisers).length) throw new Error('No campaigns with tracking links (cache left as-is).');

  writeFileSync(OUT, JSON.stringify({ capturedAt: new Date().toISOString(), advertisers }, null, 2));
  console.log(`Wrote ${Object.keys(advertisers).length} Impact advertiser link(s): ${Object.keys(advertisers).join(', ')} -> ${OUT}`);
}

main().catch((e) => { console.error('fetch-impact-links failed:', e.message); process.exit(1); });
