import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wrapImpactAffiliate } from './impact-links';
import { couponStoreSlug } from './coupon-stores';

const COUPON_REVALIDATE_SECONDS = 86400;
const GENIUSLINK_CACHE_FILE = join(process.cwd(), 'data', 'geniuslink-cache.json');
const STORE_COUPON_CACHE_FILE = join(process.cwd(), 'data', 'coupon-store-coupons.json');
const GENIUSLINK_TIMEOUT_MS = 15000;

export type Coupon = {
  store: string;
  title: string;
  code?: string;
  discount: string;
  category: string;
  href: string;
  type: 'Coupon' | 'Promo code' | 'Sale';
  verified: string;
  featured?: boolean;
};

export type Retailer = {
  name: string;
  label: string;
  href: string;
  logo?: string;
  domain?: string;
};

export type CouponBrandGroup = {
  store: Retailer;
  coupons: Coupon[];
};

type ApiRecord = Record<string, unknown>;
type StoreCouponCache = {
  stores?: Record<string, {
    capturedAt?: string;
    coupons?: Coupon[];
  }>;
};

const STARTER_COUPONS: Coupon[] = [
  {
    store: 'Amazon',
    title: 'Clip limited-time coupons before checkout on featured electronics and home products.',
    discount: 'Up to 40% off',
    category: 'Amazon coupons',
    href: '/coupons/amazon',
    type: 'Coupon',
    verified: 'Updated today',
    featured: true,
  },
  {
    store: 'eBay',
    title: 'Stack seller markdowns with seasonal voucher offers across tech, fashion, and home.',
    code: 'DEALSTACK',
    discount: 'Extra 10% off',
    category: 'Marketplace codes',
    href: '/search?q=ebay+promo+code',
    type: 'Promo code',
    verified: 'Verified feed',
    featured: true,
  },
  {
    store: 'Walmart',
    title: 'Rollbacks and online-only offers on smart home, appliances, toys, and daily essentials.',
    discount: 'Rollback deals',
    category: 'Department deals',
    href: '/search?q=walmart+deals',
    type: 'Sale',
    verified: 'Updated daily',
  },
  {
    store: 'Best Buy',
    title: 'Member pricing and open-box savings on laptops, TVs, monitors, and headphones.',
    code: 'TECHSAVE',
    discount: 'Save 5-25%',
    category: 'Electronics',
    href: '/search?q=best+buy+promo+code',
    type: 'Promo code',
    verified: 'Checked today',
  },
  {
    store: 'Target',
    title: 'Circle offers and weekly promo-code drops for beauty, home, baby, and seasonal goods.',
    discount: 'Weekly offers',
    category: 'Home and lifestyle',
    href: '/search?q=target+coupon',
    type: 'Coupon',
    verified: 'Fresh picks',
  },
  {
    store: 'Newegg',
    title: 'PC parts, gaming gear, storage, and component bundles with checkout code savings.',
    code: 'BUILDNOW',
    discount: 'Extra 12% off',
    category: 'Computing',
    href: '/search?q=newegg+promo+code',
    type: 'Promo code',
    verified: 'Code checked',
  },
];

const FALLBACK_RETAILERS: Retailer[] = [
  { name: 'Amazon', label: 'Amazon coupon codes', href: '/coupons/amazon' },
  { name: 'eBay', label: 'eBay promo codes', href: '/coupons/ebay' },
  { name: 'Walmart', label: 'Walmart coupons', href: '/coupons/walmart' },
  { name: 'Best Buy', label: 'Best Buy discount codes', href: '/search?q=best+buy+discount+codes' },
  { name: 'Target', label: 'Target coupons', href: '/search?q=target+coupons' },
  { name: 'Newegg', label: 'Newegg promo codes', href: '/coupons/newegg' },
  { name: 'Nike', label: 'Nike discount codes', href: '/search?q=nike+discount+codes' },
  { name: 'Dell', label: 'Dell coupon codes', href: '/search?q=dell+coupon+codes' },
  { name: 'Lenovo', label: 'Lenovo promo codes', href: '/search?q=lenovo+promo+codes' },
  { name: 'Samsung', label: 'Samsung coupons', href: '/search?q=samsung+coupons' },
  { name: 'Dyson', label: 'Dyson discount codes', href: '/search?q=dyson+discount+codes' },
  { name: 'HP', label: 'HP coupon codes', href: '/coupons/hp' },
];

const PROMO_HOST = process.env.RAPIDAPI_PROMO_CODES_HOST || 'get-promo-codes.p.rapidapi.com';
const PROMO_COUPONS_PATH = process.env.RAPIDAPI_PROMO_CODES_PATH || '/data/get-coupons/?page=1&sort=update_time_desc';
const PROMO_STORES_PATH = process.env.RAPIDAPI_PROMO_STORES_PATH || '/data/get-stores/?page=1';
const POPULAR_BRANDS = (process.env.RAPIDAPI_POPULAR_COUPON_BRANDS || 'amazon,ebay,walmart,newegg')
  .split(',')
  .map((brand) => brand.trim())
  .filter(Boolean);

async function fetchRapidApi(host: string, path: string): Promise<unknown | null> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://${host}${path}`, {
      headers: {
        'x-rapidapi-host': host,
        'x-rapidapi-key': key,
      },
      next: { revalidate: COUPON_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

let geniusCache: Record<string, string> | null = null;
let geniusDirty = false;

function geniusEnabled() {
  return Boolean(process.env.GENIUSLINK_API_KEY && process.env.GENIUSLINK_API_SECRET && process.env.GENIUSLINK_GROUP_ID);
}

function loadGeniusCache() {
  if (geniusCache) return geniusCache;
  try {
    geniusCache = existsSync(GENIUSLINK_CACHE_FILE)
      ? JSON.parse(readFileSync(GENIUSLINK_CACHE_FILE, 'utf8')) as Record<string, string>
      : {};
  } catch {
    geniusCache = {};
  }
  return geniusCache;
}

function flushGeniusCache() {
  if (!geniusDirty || !geniusCache) return;
  writeFileSync(GENIUSLINK_CACHE_FILE, JSON.stringify(geniusCache, null, 2));
  geniusDirty = false;
}

function readStoreCouponCache(storeId: number | string) {
  if (!existsSync(STORE_COUPON_CACHE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(STORE_COUPON_CACHE_FILE, 'utf8')) as StoreCouponCache;
    const cached = parsed.stores?.[String(storeId)]?.coupons;
    return Array.isArray(cached) ? cached : null;
  } catch {
    return null;
  }
}

async function geniusWrap(url: string) {
  if (!url || !url.startsWith('http') || !geniusEnabled()) return url;
  if (/^https?:\/\/(?:www\.)?geni\.us\//i.test(url)) return url;

  const cache = loadGeniusCache();
  if (cache[url]) return cache[url];

  const domain = process.env.GENIUSLINK_DOMAIN || 'geni.us';
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), GENIUSLINK_TIMEOUT_MS);
    const res = await fetch('https://api.geni.us/v3/shorturls', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-Api-Key': process.env.GENIUSLINK_API_KEY ?? '',
        'X-Api-Secret': process.env.GENIUSLINK_API_SECRET ?? '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        url,
        groupId: Number(process.env.GENIUSLINK_GROUP_ID),
        domain,
        linkCreatorSetting: 'Simple',
      }),
      next: { revalidate: COUPON_REVALIDATE_SECONDS },
    });
    if (!res.ok) return url;
    const code = (await res.json())?.shortUrl?.code;
    if (!code) return url;
    const shortUrl = `https://${domain}/${code}`;
    cache[url] = shortUrl;
    geniusDirty = true;
    return shortUrl;
  } catch {
    return url;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function monetizeUrl(url: string) {
  const impactUrl = wrapImpactAffiliate({ id: 0, productUrl: url });
  if (impactUrl) return impactUrl;
  return geniusWrap(url);
}

async function geniusWrapCoupons(coupons: Coupon[]) {
  const wrapped: Coupon[] = [];
  for (const coupon of coupons) {
    wrapped.push({ ...coupon, href: await monetizeUrl(coupon.href) });
  }
  flushGeniusCache();
  return wrapped;
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordsFrom(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];

  for (const key of ['data', 'coupons', 'results', 'items', 'offers', 'records', 'list', 'deals']) {
    const nested = recordsFrom(value[key]);
    if (nested.length > 0) return nested;
  }

  return [];
}

function textField(record: ApiRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function absoluteHref(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return fallback;
}

function nestedRecord(record: ApiRecord, key: string): ApiRecord {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function storeNameFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    const base = host.split('.')[0];
    if (!base) return host;
    return base
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return null;
  }
}

function couponFromAmazonDeal(record: ApiRecord): Coupon | null {
  const pricing = nestedRecord(record, 'pricing');
  const promo = nestedRecord(record, 'promo');
  const coupon = nestedRecord(record, 'coupon');
  const urls = nestedRecord(record, 'urls');
  const offer = nestedRecord(record, 'offer');

  const store = textField(offer, ['merchant']) || 'Amazon';
  const title = textField(record, ['product_name', 'productName', 'name', 'title']);
  if (!title) return null;

  const code = textField(promo, ['code']);
  const couponText = textField(coupon, ['raw']);
  const totalDiscount = textField(record, ['total_discount_pct', 'totalDiscountPct']);
  const promoDiscount = textField(promo, ['discount_pct', 'discountPct']);
  const combinedPrice = textField(pricing, ['estimated_combined_price', 'estimatedCombinedPrice']);
  const promoPrice = textField(pricing, ['price_after_promo_only', 'priceAfterPromoOnly']);
  const discount = totalDiscount
    ? `${totalDiscount}% off`
    : promoDiscount
      ? `${promoDiscount}% promo`
      : couponText || 'Amazon deal';

  return {
    store,
    title,
    code: code || undefined,
    discount: combinedPrice ? `${discount} - est. ${combinedPrice}` : discount,
    category: textField(record, ['category']) || 'Amazon deals',
    href: absoluteHref(
      textField(urls, ['affiliate', 'product']) || textField(promo, ['promo_url', 'promoUrl']),
      `/search?q=${encodeURIComponent(`${title} Amazon promo`)}`,
    ),
    type: code ? 'Promo code' : 'Coupon',
    verified: promoPrice ? `Promo price ${promoPrice}` : 'Recently updated',
    featured: true,
  };
}

function couponFromRecord(record: ApiRecord, source: 'promo' | 'amazonDeals', storesById?: Map<string, Retailer>): Coupon | null {
  if (source === 'amazonDeals') return couponFromAmazonDeal(record);

  const storeUrl = textField(record, ['url', 'link', 'store_url', 'storeUrl', 'website', 'domain']);
  const storeId = textField(record, ['store_id', 'storeId']);
  const store = textField(record, [
    'store',
    'store_name',
    'merchant',
    'merchant_name',
    'merchantName',
    'shop',
    'brand',
    'website',
    'domain',
  ]) || storesById?.get(storeId ?? '')?.name || storeNameFromUrl(storeUrl) || (storeId ? `Store ${storeId}` : null);

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

  if (!store || !title) return null;

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
  const category = textField(record, ['category', 'category_name', 'categoryName', 'type']) || 'Promo codes';
  const href = absoluteHref(
    storeUrl || textField(record, ['affiliate_url', 'affiliateUrl', 'product_url', 'productUrl']),
    `/search?q=${encodeURIComponent(`${store} ${code ? 'promo code' : 'coupon'}`)}`,
  );
  const expires = textField(record, ['expires', 'expiry', 'expiry_date', 'expire_date', 'end_date', 'valid_till']);

  return {
    store,
    title,
    code: code || undefined,
    discount,
    category,
    href,
    type: code ? 'Promo code' : 'Coupon',
    verified: expires ? `Expires ${expires}` : 'Recently updated',
    featured: Boolean(code),
  };
}

function retailerFromRecord(record: ApiRecord): Retailer | null {
  const name = textField(record, ['name', 'store', 'store_name', 'storeName', 'merchant', 'merchant_name', 'title']);
  if (!name) return null;
  const domain = textField(record, ['domain', 'website']);
  const href = absoluteHref(
    textField(record, ['url', 'link', 'store_url', 'storeUrl', 'website', 'domain']),
    `/search?q=${encodeURIComponent(`${name} promo codes`)}`,
  );

  return {
    name,
    label: `${name} promo codes`,
    href,
    logo: textField(record, ['logo']) || undefined,
    domain: domain || undefined,
  };
}

function retailerFromCoupon(coupon: Coupon): Retailer {
  return {
    name: coupon.store,
    label: `${coupon.store} ${coupon.code ? 'promo codes' : 'coupons'}`,
    href: `/coupons/${couponStoreSlug(coupon.store)}`,
  };
}

function brandScore(record: ApiRecord, brand: string) {
  const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const storeName = (textField(record, ['store_name', 'storeName', 'name']) || '').toLowerCase();
  const domain = (textField(record, ['domain', 'url']) || '').toLowerCase();
  const normalizedName = storeName.replace(/[^a-z0-9]/g, '');
  const normalizedDomain = domain.replace(/[^a-z0-9]/g, '');

  if (normalizedName === normalizedBrand) return 0;
  if (normalizedDomain.startsWith(normalizedBrand)) return 1;
  if (normalizedName.includes(normalizedBrand)) return 2;
  if (normalizedDomain.includes(normalizedBrand)) return 3;
  return 4;
}

async function fetchBrandGroup(brand: string): Promise<CouponBrandGroup | null> {
  const storeData = await fetchRapidApi(PROMO_HOST, `/data/get-stores/?page=1&keyword=${encodeURIComponent(brand)}`);
  const storeRecords = recordsFrom(storeData).sort((a, b) => brandScore(a, brand) - brandScore(b, brand));
  let bestGroup: CouponBrandGroup | null = null;
  let bestCouponCount = 0;

  for (const storeRecord of storeRecords.slice(0, 8)) {
    const storeId = textField(storeRecord, ['store_id', 'storeId', 'id']);
    const store = retailerFromRecord(storeRecord);
    if (!storeId || !store) continue;

    const couponData = await fetchRapidApi(
      PROMO_HOST,
      `/data/get-coupons/?page=1&sort=update_time_desc&store_id=${encodeURIComponent(storeId)}`,
    );
    const storesById = new Map<string, Retailer>([[storeId, store]]);
    const seen = new Set<string>();
    const coupons = recordsFrom(couponData)
      .map((record) => couponFromRecord(record, 'promo', storesById))
      .filter((coupon): coupon is Coupon => coupon !== null)
      .filter((coupon) => {
        const key = `${coupon.store}|${coupon.code ?? ''}|${coupon.title}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (coupons.length > bestCouponCount) {
      bestCouponCount = coupons.length;
      bestGroup = { store, coupons: await geniusWrapCoupons(coupons.slice(0, 4)) };
    }
  }

  return bestGroup;
}

async function listBrandCouponGroups(): Promise<CouponBrandGroup[]> {
  const groups = await Promise.all(POPULAR_BRANDS.map(fetchBrandGroup));
  return groups.filter((group): group is CouponBrandGroup => group !== null).slice(0, 8);
}

async function fetchCouponApiData(): Promise<{ coupons: Coupon[]; retailers: Retailer[]; brandGroups: CouponBrandGroup[] }> {
  const [promo, promoStores, brandGroups] = await Promise.all([
    fetchRapidApi(PROMO_HOST, PROMO_COUPONS_PATH),
    fetchRapidApi(PROMO_HOST, PROMO_STORES_PATH),
    listBrandCouponGroups(),
  ]);

  const promoStoreRecords = recordsFrom(promoStores);
  const storesById = new Map<string, Retailer>();
  promoStoreRecords.forEach((record) => {
    const id = textField(record, ['store_id', 'storeId', 'id']);
    const retailer = retailerFromRecord(record);
    if (id && retailer) storesById.set(id, retailer);
  });

  const mapped = [
    ...recordsFrom(promo).map((record) => couponFromRecord(record, 'promo', storesById)),
  ].filter((coupon): coupon is Coupon => coupon !== null);

  const seen = new Set<string>();
  const coupons = mapped
    .filter((coupon) => {
      const key = `${coupon.store}|${coupon.code ?? ''}|${coupon.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 36);

  const retailerSeen = new Set<string>();
  const retailers = [
    ...coupons.map(retailerFromCoupon),
    ...promoStoreRecords.map(retailerFromRecord).filter((retailer): retailer is Retailer => retailer !== null),
  ]
    .filter((retailer) => {
      const key = retailer.name.toLowerCase();
      if (retailerSeen.has(key)) return false;
      retailerSeen.add(key);
      return true;
    })
    .slice(0, 12);

  return { coupons: await geniusWrapCoupons(coupons), retailers, brandGroups };
}

export async function listCouponPageData(): Promise<{ coupons: Coupon[]; retailers: Retailer[]; brandGroups: CouponBrandGroup[] }> {
  const { coupons, retailers, brandGroups } = await fetchCouponApiData();

  return {
    coupons: coupons.length > 0 ? coupons : STARTER_COUPONS,
    retailers: retailers.length > 0 ? retailers : FALLBACK_RETAILERS,
    brandGroups,
  };
}

export async function listCouponsForStore(storeId: number | string, storeName?: string): Promise<Coupon[]> {
  const cached = readStoreCouponCache(storeId);
  if (cached) return geniusWrapCoupons(cached);

  const storeKey = String(storeId);
  const couponData = await fetchRapidApi(
    PROMO_HOST,
    `/data/get-coupons/?page=1&sort=update_time_desc&store_id=${encodeURIComponent(storeKey)}`,
  );
  const storesById = storeName
    ? new Map<string, Retailer>([[storeKey, {
      name: storeName,
      label: `${storeName} coupons`,
      href: `/coupons/stores/${encodeURIComponent(storeKey)}`,
    }]])
    : undefined;
  const seen = new Set<string>();
  const coupons = recordsFrom(couponData)
    .map((record) => couponFromRecord(record, 'promo', storesById))
    .filter((coupon): coupon is Coupon => coupon !== null)
    .filter((coupon) => {
      const key = `${coupon.store}|${coupon.code ?? ''}|${coupon.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 48);

  return geniusWrapCoupons(coupons);
}

export async function listCoupons(): Promise<Coupon[]> {
  const { coupons } = await listCouponPageData();
  return coupons;
}

export async function listHomepageCoupons(limit = 4): Promise<Coupon[]> {
  const coupons = await listCoupons();
  const featured = coupons.filter((coupon) => coupon.featured);
  return (featured.length > 0 ? featured : coupons).slice(0, limit);
}
