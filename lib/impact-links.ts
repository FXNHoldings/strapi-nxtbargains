// Server-only: wrap a merchant offer URL with the matching Impact deep-link
// tracking template (data/impact-links.json, produced by fetch-impact-links.mjs)
// so direct merchant links (e.g. whatnot.com) monetise via Impact. Returns null
// when there's no match, the merchant doesn't allow deep-linking, or the URL's
// domain isn't an approved deep-link domain (which also prevents double-wrapping
// already-affiliated links like goto.walmart.com).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveOfferDestination } from './commerce';
import type { CommerceOffer } from './strapi';

type ImpactLink = {
  advertiser: string;
  campaignId: string;
  trackingLink: string;
  allowsDeeplinking: boolean;
  deeplinkDomains: string[];
};

let cache: Record<string, ImpactLink> | null = null;
function advertisers(): Record<string, ImpactLink> {
  if (cache) return cache;
  try {
    const p = join(process.cwd(), 'data', 'impact-links.json');
    cache = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')).advertisers ?? {}) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

function domainAllowed(host: string, domains: string[]): boolean {
  const h = host.replace(/^www\./, '');
  return domains.some((d) => {
    const dd = d.replace(/^\*\./, '');
    return h === dd || h.endsWith('.' + dd);
  });
}

// Returns an Impact deep-link for this offer, or null if it shouldn't be wrapped.
// Matches by the destination URL's DOMAIN against each approved campaign's
// deeplink domains — robust to advertiser-vs-merchant naming differences, and
// it won't double-wrap already-affiliated links (e.g. goto.walmart.com is not a
// Walmart deeplink domain).
export function wrapImpactAffiliate(offer: CommerceOffer): string | null {
  const dest = resolveOfferDestination(offer);
  if (!dest) return null;
  let host: string;
  try {
    host = new URL(dest).hostname;
  } catch {
    return null;
  }

  for (const link of Object.values(advertisers())) {
    if (!link.allowsDeeplinking || !link.trackingLink) continue;
    if (!domainAllowed(host, link.deeplinkDomains)) continue;
    try {
      const u = new URL(link.trackingLink);
      u.searchParams.set('u', dest);
      u.searchParams.set('subId1', 'nxtbargains');
      return u.toString();
    } catch {
      return null;
    }
  }
  return null;
}
