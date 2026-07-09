import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type BestSeller, type Marketplace } from '@/components/BestSellerCard';

export type BestSellerMarketplace = {
  key: Marketplace;
  label: string;
  file: string;
  description: string;
};

export const BEST_SELLER_MARKETPLACES: BestSellerMarketplace[] = [
  {
    key: 'amazon',
    label: 'Amazon',
    file: 'best-sellers.json',
    description: 'Amazon best-selling products from the refreshed marketplace cache.',
  },
  {
    key: 'ebay',
    label: 'eBay',
    file: 'best-sellers-ebay.json',
    description: 'Popular eBay products from the refreshed marketplace cache.',
  },
  {
    key: 'walmart',
    label: 'Walmart',
    file: 'best-sellers-walmart.json',
    description: 'Walmart electronics deal picks from the refreshed marketplace cache.',
  },
  {
    key: 'target',
    label: 'Target',
    file: 'best-sellers-target.json',
    description: 'Target product picks from the refreshed marketplace cache.',
  },
  {
    key: 'bestbuy',
    label: 'Best Buy',
    file: 'best-sellers-bestbuy.json',
    description: 'Best Buy product picks from the refreshed marketplace cache.',
  },
  {
    key: 'newegg',
    label: 'Newegg',
    file: 'best-sellers-newegg.json',
    description: 'Newegg product picks from the refreshed marketplace cache.',
  },
];

export function getBestSellerMarketplace(key: string) {
  return BEST_SELLER_MARKETPLACES.find((marketplace) => marketplace.key === key) ?? null;
}

export function listBestSellerGroups({ includeEmpty = false }: { includeEmpty?: boolean } = {}) {
  return BEST_SELLER_MARKETPLACES.map((marketplace) => ({
    key: marketplace.key,
    items: listBestSellersForMarketplace(marketplace.key),
  })).filter((group) => includeEmpty || group.items.length > 0);
}

export function listBestSellersForMarketplace(marketplaceKey: Marketplace): BestSeller[] {
  const marketplace = getBestSellerMarketplace(marketplaceKey);
  if (!marketplace) return [];

  try {
    const path = join(process.cwd(), 'data', marketplace.file);
    if (!existsSync(path)) return [];

    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { items?: BestSeller[] };
    const geniusDestinations = geniusDestinationMap();

    return (parsed.items ?? [])
      .map((item) => ({
        ...item,
        marketplace: marketplace.key,
        url: isGoogleShoppingUrl(geniusDestinations.get(item.url) ?? item.url)
          ? marketplaceSearchUrl(marketplace.key, item.title)
          : item.url,
      }))
      .filter((item) => Boolean(item.title && item.url));
  } catch {
    return [];
  }
}

function geniusDestinationMap() {
  try {
    const path = join(process.cwd(), 'data', 'geniuslink-cache.json');
    if (!existsSync(path)) return new Map<string, string>();
    const cache = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
    return new Map(Object.entries(cache).map(([destination, short]) => [short, destination]));
  } catch {
    return new Map<string, string>();
  }
}

function isGoogleShoppingUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const googleHost = host === 'googleadservices.com'
      || host.endsWith('.googleadservices.com')
      || host === 'shopping.google.com'
      || host.endsWith('.shopping.google.com')
      || /^google\.[a-z.]+$/.test(host)
      || /\.google\.[a-z.]+$/.test(host);
    if (!googleHost) return false;
    return host.includes('googleadservices')
      || host.includes('shopping.google')
      || ['/search', '/shopping', '/aclk', '/url'].some((path) => parsed.pathname.startsWith(path))
      || parsed.searchParams.get('tbm') === 'shop'
      || parsed.searchParams.get('udm') === '28'
      || parsed.searchParams.has('ibp');
  } catch {
    return false;
  }
}

function marketplaceSearchUrl(marketplace: Marketplace, title: string) {
  const query = encodeURIComponent(title.trim());
  if (marketplace === 'amazon') return `https://www.amazon.com/s?k=${query}`;
  if (marketplace === 'bestbuy') return `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`;
  if (marketplace === 'ebay') return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
  if (marketplace === 'newegg') return `https://www.newegg.com/p/pl?d=${query}`;
  if (marketplace === 'target') return `https://www.target.com/s?searchTerm=${query}`;
  if (marketplace === 'walmart') return `https://www.walmart.com/search?q=${query}`;
  return '';
}
