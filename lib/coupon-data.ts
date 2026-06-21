const COUPON_REVALIDATE_SECONDS = 86400;

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

type Retailer = {
  name: string;
  label: string;
  href: string;
};

type ApiRecord = Record<string, unknown>;

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

const PROMO_HOST = process.env.RAPIDAPI_PROMO_CODES_HOST || 'get-promo-codes.p.rapidapi.com';
const PROMO_COUPONS_PATH = process.env.RAPIDAPI_PROMO_CODES_PATH || '/data/get-coupons/?page=1&sort=update_time_desc';
const PROMO_STORES_PATH = process.env.RAPIDAPI_PROMO_STORES_PATH || '/data/get-stores/?page=1';
const AMAZON_DEALS_HOST = process.env.RAPIDAPI_AMAZON_DEALS_HOST || 'amazon-promo-codes-and-deals.p.rapidapi.com';
const AMAZON_DEALS_PATH = process.env.RAPIDAPI_AMAZON_DEALS_PATH || '/deals.php?limit=20&offset=0&min_discount=50&max_discount=90&channel=1&category=Apparel&merchant=Amazon&condition=New&coupon_only=1&promo_only=1&since=2026-03-26&dual_offer=1';

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
    verified: promoPrice ? `Promo price ${promoPrice}` : 'Amazon API',
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
    verified: expires ? `Expires ${expires}` : 'Live API',
    featured: Boolean(code),
  };
}

function retailerFromRecord(record: ApiRecord): Retailer | null {
  const name = textField(record, ['name', 'store', 'store_name', 'storeName', 'merchant', 'merchant_name', 'title']);
  if (!name) return null;
  const href = absoluteHref(
    textField(record, ['url', 'link', 'store_url', 'storeUrl', 'website', 'domain']),
    `/search?q=${encodeURIComponent(`${name} promo codes`)}`,
  );

  return {
    name,
    label: `${name} promo codes`,
    href,
  };
}

export async function listCoupons(): Promise<Coupon[]> {
  const [promo, promoStores, amazonDeals] = await Promise.all([
    fetchRapidApi(PROMO_HOST, PROMO_COUPONS_PATH),
    fetchRapidApi(PROMO_HOST, PROMO_STORES_PATH),
    fetchRapidApi(AMAZON_DEALS_HOST, AMAZON_DEALS_PATH),
  ]);

  const promoStoreRecords = recordsFrom(promoStores);
  const storesById = new Map<string, Retailer>();
  promoStoreRecords.forEach((record) => {
    const id = textField(record, ['store_id', 'storeId', 'id']);
    const retailer = retailerFromRecord(record);
    if (id && retailer) storesById.set(id, retailer);
  });

  const mapped = [
    ...recordsFrom(amazonDeals).map((record) => couponFromRecord(record, 'amazonDeals')),
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

  return coupons.length > 0 ? coupons : STARTER_COUPONS;
}

export async function listHomepageCoupons(limit = 4): Promise<Coupon[]> {
  const coupons = await listCoupons();
  const featured = coupons.filter((coupon) => coupon.featured);
  return (featured.length > 0 ? featured : coupons).slice(0, limit);
}
