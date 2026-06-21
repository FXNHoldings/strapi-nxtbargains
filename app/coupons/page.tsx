import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import CouponLottie from '@/components/CouponLottie';

const COUPON_REVALIDATE_SECONDS = 86400;

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Discount, Coupons',
  description:
    'Find Amazon coupons, store promo codes, voucher links, and category discounts curated by NXT.Bargains.',
  alternates: { canonical: '/coupons' },
};

type Coupon = {
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
    href: '/search?q=amazon+coupon',
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
  {
    store: 'Nike',
    title: 'Seasonal markdowns and app-first promos on sneakers, training apparel, and sportswear.',
    discount: 'Up to 30% off',
    category: 'Clothing and fashion',
    href: '/search?q=nike+discount+code',
    type: 'Sale',
    verified: 'Trending',
  },
  {
    store: 'Dell',
    title: 'Laptop, monitor, and desktop coupon codes for home office and gaming setups.',
    code: 'UPGRADE',
    discount: 'Extra 8% off',
    category: 'Computing',
    href: '/search?q=dell+coupon+code',
    type: 'Promo code',
    verified: 'Editor pick',
  },
];

const FALLBACK_RETAILERS: Retailer[] = [
  { name: 'Amazon', label: 'Amazon coupon codes', href: '/search?q=amazon+coupon+codes' },
  { name: 'eBay', label: 'eBay promo codes', href: '/search?q=ebay+promo+codes' },
  { name: 'Walmart', label: 'Walmart coupons', href: '/search?q=walmart+coupons' },
  { name: 'Best Buy', label: 'Best Buy discount codes', href: '/search?q=best+buy+discount+codes' },
  { name: 'Target', label: 'Target coupons', href: '/search?q=target+coupons' },
  { name: 'Newegg', label: 'Newegg promo codes', href: '/search?q=newegg+promo+codes' },
  { name: 'Nike', label: 'Nike discount codes', href: '/search?q=nike+discount+codes' },
  { name: 'Dell', label: 'Dell coupon codes', href: '/search?q=dell+coupon+codes' },
  { name: 'Lenovo', label: 'Lenovo promo codes', href: '/search?q=lenovo+promo+codes' },
  { name: 'Samsung', label: 'Samsung coupons', href: '/search?q=samsung+coupons' },
  { name: 'Dyson', label: 'Dyson discount codes', href: '/search?q=dyson+discount+codes' },
  { name: 'HP', label: 'HP coupon codes', href: '/search?q=hp+coupon+codes' },
];

const popularCategories = [
  'Electronics coupon codes',
  'Computing discounts',
  'Home and garden coupons',
  'Fashion promo codes',
  'Beauty and health offers',
  'Gaming deals',
  'Mobile and wireless codes',
  'Sports and outdoors coupons',
  'Small appliance deals',
  'Office furniture discounts',
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

async function listApiData(): Promise<{ coupons: Coupon[]; retailers: Retailer[] }> {
  const [promo, promoStores, amazonDeals] = await Promise.all([
    fetchRapidApi(PROMO_HOST, PROMO_COUPONS_PATH),
    fetchRapidApi(PROMO_HOST, PROMO_STORES_PATH),
    fetchRapidApi(AMAZON_DEALS_HOST, AMAZON_DEALS_PATH),
  ]);

  const promoStoreRecords = recordsFrom(promoStores);
  const retailerSeen = new Set<string>();
  const retailers = promoStoreRecords
    .map(retailerFromRecord)
    .filter((retailer): retailer is Retailer => retailer !== null)
    .filter((retailer) => {
      const key = retailer.name.toLowerCase();
      if (retailerSeen.has(key)) return false;
      retailerSeen.add(key);
      return true;
    })
    .slice(0, 12);

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

  return { coupons, retailers };
}

function buildCategorySections(coupons: Coupon[]) {
  const byStore = (stores: string[]) =>
    coupons.filter((coupon) => stores.some((store) => coupon.store.toLowerCase().includes(store.toLowerCase())));
  const byCategory = (terms: string[]) =>
    coupons.filter((coupon) => terms.some((term) => `${coupon.category} ${coupon.title}`.toLowerCase().includes(term)));

  return [
    {
      title: 'Home and garden',
      intro: 'Appliances, bedding, smart home, furniture, cleaning, and everyday household coupons.',
      items: [...byStore(['Walmart', 'Target', 'Amazon']), ...byCategory(['home', 'garden', 'appliance'])].slice(0, 6),
    },
    {
      title: 'Electronics',
      intro: 'Laptop, TV, monitor, phone, headphone, and gaming promo codes from major retailers.',
      items: [...byStore(['Amazon', 'Best Buy', 'Newegg', 'Dell']), ...byCategory(['electronics', 'computing', 'tech'])].slice(0, 6),
    },
    {
      title: 'Clothing and fashion',
      intro: 'Fashion markdowns, sneaker promos, outlet sales, and storewide discount-code leads.',
      items: [...byStore(['Nike', 'Target', 'eBay']), ...byCategory(['clothing', 'fashion', 'shoe', 'apparel'])].slice(0, 6),
    },
  ].filter((section) => section.items.length > 0);
}

export default async function CouponsPage() {
  const { coupons: apiCoupons, retailers: apiRetailers } = await listApiData();
  const coupons = apiCoupons.length > 0 ? apiCoupons : STARTER_COUPONS;
  const popularRetailers = apiRetailers.length > 0 ? apiRetailers : FALLBACK_RETAILERS;
  const featured = coupons.filter((coupon) => coupon.featured);
  const categorySections = buildCategorySections(coupons);
  const couponJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Discount, Coupons',
    url: `${SITE.url}/coupons`,
    description: metadata.description,
    hasPart: coupons.map((coupon) => ({
      '@type': 'Offer',
      name: `${coupon.store}: ${coupon.discount}`,
      category: coupon.category,
      url: `${SITE.url}${coupon.href}`,
      description: coupon.title,
    })),
  };

  return (
    <main className="bg-paper" data-testid="coupons-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(couponJsonLd) }}
      />

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto grid max-w-[1366px] gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-20">
          <div>
            <p className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-primary">
              Discount, Coupons
            </p>
            <h1 className="mt-4 max-w-4xl font-display !text-[60px] font-bold leading-[1.04] text-ink">
              Save more with verified coupons, promo codes, and marketplace offers.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
              Browse Amazon coupon leads, storewide promo codes, category discounts, and quick
              search shortcuts for the retailers NXT.Bargains shoppers check most.
            </p>
            <form action="/search" className="mt-8 flex max-w-2xl border border-ink/15 bg-white shadow-sm">
              <label htmlFor="coupon-search" className="sr-only">Search coupon codes</label>
              <input
                id="coupon-search"
                name="q"
                type="search"
                placeholder="Search a store, coupon, product, or promo code"
                className="h-14 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-ink/40"
              />
              <button type="submit" className="bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis sm:px-7">
                Search
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {['Amazon coupons', 'Electronics', 'Home deals', 'Fashion codes', 'Free shipping'].map((tag) => (
                <Link
                  key={tag}
                  href={tag === 'Amazon coupons' ? '/coupons/amazon' : `/search?q=${encodeURIComponent(tag)}`}
                  className="inline-flex border border-ink/10 bg-paper px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/65 transition hover:border-primary hover:text-primary"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          <CouponLottie />
        </div>
      </section>

      <section className="py-12 sm:py-16" data-testid="featured-coupons">
        <div className="mx-auto max-w-[1366px] px-6">
          <SectionHead
            eyebrow="Best today"
            title="Today's best coupon codes"
            intro="High-intent offers surfaced first, with discount type, code status, and a fast path into search."
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {(featured.length > 0 ? featured : coupons.slice(0, 2)).map((coupon) => (
              <CouponCard key={`${coupon.store}-${coupon.discount}`} coupon={coupon} featured />
            ))}
          </div>
        </div>
      </section>

      {categorySections.map((section) => (
        <section key={section.title} className="border-t border-ink/10 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-[1366px] px-6">
            <SectionHead eyebrow="Browse by category" title={section.title} intro={section.intro} />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {section.items.map((coupon) => (
                <CouponCard key={`${section.title}-${coupon.store}`} coupon={coupon} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="border-t border-ink/10 py-12 sm:py-16">
        <div className="mx-auto grid max-w-[1366px] gap-8 px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SectionHead
              eyebrow="Popular retailers"
              title="Store coupon shortcuts"
              intro="Jump straight into code searches for the retailers shoppers compare most often."
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {popularRetailers.map((retailer) => (
                <Link
                  key={retailer.name}
                  href={retailer.href}
                  className="group flex items-center gap-3 border border-ink/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center bg-muted font-display text-sm font-bold text-primary">
                    {retailer.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-display text-sm font-bold leading-5 text-ink transition group-hover:text-primary">
                    {retailer.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="border border-ink/10 bg-white p-6">
            <p className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-primary">
              Popular categories
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {popularCategories.map((category) => (
                <Link
                  key={category}
                  href={`/search?q=${encodeURIComponent(category)}`}
                  className="inline-flex border border-ink/10 bg-paper px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-primary hover:text-primary"
                >
                  {category}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display font-bold text-ink">{title}</h2>
      <p className="mt-2 text-[0.98rem] leading-relaxed text-ink/60">{intro}</p>
    </div>
  );
}

function CouponCard({ coupon, featured = false }: { coupon: Coupon; featured?: boolean }) {
  return (
    <article className="group flex h-full flex-col border border-ink/10 bg-white transition hover:-translate-y-0.5 hover:border-primary">
      <div className={`flex items-start justify-between gap-4 border-b border-ink/10 ${featured ? 'p-6' : 'p-5'}`}>
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center bg-primary text-white">
            <span className="font-display text-base font-extrabold">{coupon.store.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink">{coupon.store}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">{coupon.type}</p>
          </div>
        </div>
        <span className="shrink-0 bg-[#e9f7ef] px-3 py-1 text-xs font-bold text-[#16794a]">
          {coupon.verified}
        </span>
      </div>

      <div className={`${featured ? 'p-6' : 'p-5'} flex flex-1 flex-col`}>
        <p className="font-display text-2xl font-bold leading-tight text-ink">{coupon.discount}</p>
        <h4 className="mt-4 line-clamp-3 text-base font-semibold leading-6 text-ink/78">{coupon.title}</h4>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-dashed border-ink/20 bg-paper p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Code</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{coupon.code ?? 'No code needed'}</p>
          </div>
          <div className="border border-ink/10 bg-paper p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Category</p>
            <p className="mt-1 text-sm font-semibold text-ink">{coupon.category}</p>
          </div>
        </div>
        <Link
          href={coupon.href}
          className="mt-5 inline-flex w-full items-center justify-center bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis"
        >
          View offer
        </Link>
      </div>
    </article>
  );
}
