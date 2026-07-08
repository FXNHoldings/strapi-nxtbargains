import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { listCouponPageData, type Coupon, type CouponBrandGroup, type Retailer } from '@/lib/coupon-data';
import CouponLottie from '@/components/CouponLottie';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Discount, Coupons',
  description:
    'Find Amazon coupons, store promo codes, voucher links, and category discounts curated by NXT.Bargains.',
  alternates: { canonical: '/coupons' },
};

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

const knownStoreDomains: Array<[RegExp, string]> = [
  [/amazon/, 'amazon.com'],
  [/ebay/, 'ebay.com'],
  [/walmart/, 'walmart.com'],
  [/newegg/, 'newegg.com'],
];

function buildCategorySections(coupons: Coupon[]) {
  const byStore = (stores: string[]) =>
    coupons.filter((coupon) => stores.some((store) => coupon.store.toLowerCase().includes(store.toLowerCase())));
  const byCategory = (terms: string[]) =>
    coupons.filter((coupon) => terms.some((term) => `${coupon.category} ${coupon.title}`.toLowerCase().includes(term)));
  const withFill = (preferred: Coupon[], offset: number) => {
    const preferredKeys = new Set(preferred.map(couponKey));
    const filler = [...coupons.slice(offset), ...coupons.slice(0, offset)].filter((coupon) => !preferredKeys.has(couponKey(coupon)));
    return dedupeCoupons([...preferred, ...filler]).slice(0, 9);
  };

  return [
    {
      title: 'Home and garden',
      intro: 'Appliances, bedding, smart home, furniture, cleaning, and everyday household coupons.',
      items: withFill([...byStore(['Walmart', 'Target', 'Amazon']), ...byCategory(['home', 'garden', 'appliance'])], 0),
    },
    {
      title: 'Electronics',
      intro: 'Laptop, TV, monitor, phone, headphone, and gaming promo codes from major retailers.',
      items: withFill([...byStore(['Amazon', 'Best Buy', 'Newegg', 'Dell']), ...byCategory(['electronics', 'computing', 'tech'])], 9),
    },
    {
      title: 'Clothing and fashion',
      intro: 'Fashion markdowns, sneaker promos, outlet sales, and storewide discount-code leads.',
      items: withFill([...byStore(['Nike', 'Target', 'eBay']), ...byCategory(['clothing', 'fashion', 'shoe', 'apparel'])], 18),
    },
  ].filter((section) => section.items.length > 0);
}

function couponKey(coupon: Coupon) {
  return `${coupon.store}|${coupon.code ?? ''}|${coupon.title}`.toLowerCase();
}

function dedupeCoupons(coupons: Coupon[]) {
  const seen = new Set<string>();
  return coupons.filter((coupon) => {
    const key = couponKey(coupon);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function offerUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  return `${SITE.url}${href}`;
}

export default async function CouponsPage() {
  const { coupons, retailers: popularRetailers, brandGroups } = await listCouponPageData();
  const focusedCoupons = dedupeCoupons([
    ...brandGroups.flatMap((group) => group.coupons),
    ...coupons,
  ]);
  const focusedRetailers = brandGroups.length > 0
    ? brandGroups.map((group) => group.store)
    : popularRetailers;
  const storeLogos = Object.fromEntries(
    focusedRetailers.map((retailer) => [retailer.name.toLowerCase(), retailerLogo(retailer)]),
  );
  const featured = focusedCoupons.filter((coupon) => coupon.featured);
  const topCoupons = (featured.length > 0 ? featured : focusedCoupons).slice(0, 9);
  const categorySections = buildCategorySections(focusedCoupons);
  const couponJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Discount, Coupons',
    url: `${SITE.url}/coupons`,
    description: metadata.description,
    hasPart: focusedCoupons.map((coupon) => ({
      '@type': 'Offer',
      name: `${coupon.store}: ${coupon.discount}`,
      category: coupon.category,
      url: offerUrl(coupon.href),
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
            <h1 className="mt-4 max-w-4xl font-display font-bold leading-[1.04] text-ink">
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

      <section className="bg-white py-10 sm:py-12">
        <div className="mx-auto grid max-w-[1366px] gap-10 px-6 lg:grid-cols-2">
          <div>
            <CompactSectionHead title="Popular Retailers" />
            <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {focusedRetailers.slice(0, 12).map((retailer) => (
                <RetailerShortcut key={retailer.name} retailer={retailer} />
              ))}
            </div>
          </div>

          <div>
            <CompactSectionHead title="Popular Categories" href="/sitemap" />
            <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {popularCategories.slice(0, 10).map((category) => (
                <CategoryShortcut key={category} category={category} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10 bg-paper py-10 sm:py-12" data-testid="featured-coupons">
        <div className="mx-auto max-w-[1366px] px-6">
          {brandGroups.length > 0 ? <BrandStoresSection groups={brandGroups} /> : null}

          <CouponGridSection title="Today's Best Coupon Codes" coupons={topCoupons} storeLogos={storeLogos} />

          {categorySections.map((section) => (
            <CouponGridSection
              key={section.title}
              title={section.title}
              intro={section.intro}
              coupons={section.items}
              storeLogos={storeLogos}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function CompactSectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/10 pb-3">
      <h2 className="font-display !text-[1rem] font-bold text-ink">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/55 underline underline-offset-4 transition hover:text-primary"
        >
          View all
        </Link>
      ) : null}
    </div>
  );
}

function retailerLogo(retailer: Pick<Retailer, 'name' | 'logo' | 'domain' | 'href'>) {
  const domain = knownStoreDomain(retailer.name) || retailer.domain || domainFromHref(retailer.href);
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null;
}

function knownStoreDomain(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return knownStoreDomains.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function domainFromHref(href: string) {
  if (!href.startsWith('http')) return null;
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function couponLogo(coupon: Coupon, storeLogos: Record<string, string | null>) {
  const key = coupon.store.toLowerCase();
  const knownDomain = knownStoreDomain(coupon.store);
  if (knownDomain) return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(knownDomain)}&sz=128`;
  if (storeLogos[key]) return storeLogos[key];
  const match = Object.entries(storeLogos).find(([store]) => store.includes(key) || key.includes(store));
  return match?.[1] ?? null;
}

function StoreLogo({ name, logo, className = 'h-9 w-12' }: { name: string; logo?: string | null; className?: string }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={`${name} logo`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${className} shrink-0 bg-white object-contain p-1.5 ring-1 ring-inset ring-ink/10`}
    />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center bg-paper font-display text-[0.78rem] font-extrabold uppercase text-ink ring-1 ring-inset ring-ink/10`}>
      {name.slice(0, 3)}
    </span>
  );
}

function RetailerShortcut({ retailer }: { retailer: Retailer }) {
  return (
    <Link href={retailer.href} className="group flex min-h-10 items-center gap-3">
      <StoreLogo name={retailer.name} logo={retailerLogo(retailer)} />
      <span className="line-clamp-2 text-[0.82rem] font-semibold leading-4 text-primary transition group-hover:text-primary-emphasis">
        {retailer.label}
      </span>
    </Link>
  );
}

function CategoryShortcut({ category }: { category: string }) {
  return (
    <Link href={`/search?q=${encodeURIComponent(category)}`} className="group flex min-h-10 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-primary/25 bg-primary/5 font-display text-sm font-bold text-primary">
        {category.charAt(0)}
      </span>
      <span className="line-clamp-2 text-[0.82rem] font-semibold leading-4 text-primary transition group-hover:text-primary-emphasis">
        {category}
      </span>
    </Link>
  );
}

function BrandStoresSection({ groups }: { groups: CouponBrandGroup[] }) {
  return (
    <section className="border-b border-ink/10 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display !text-[1.05rem] font-bold text-ink">Popular Brand Stores</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/55">
            Live store matches from the coupon API, grouped by brand with current codes and offers.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <BrandStoreCard key={group.store.name} group={group} />
        ))}
      </div>
    </section>
  );
}

function BrandStoreCard({ group }: { group: CouponBrandGroup }) {
  const logo = retailerLogo(group.store);

  return (
    <article className="border border-ink/10 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-ink/10 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <StoreLogo name={group.store.name} logo={logo} className="h-11 w-14" />
          <div className="min-w-0">
            <h3 className="truncate font-display !text-[1rem] font-bold text-ink">{group.store.name}</h3>
            <p className="mt-0.5 text-[0.75rem] font-semibold text-ink/50">{group.coupons.length} live offers</p>
          </div>
        </div>
        <Link
          href={group.store.href}
          className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary underline underline-offset-4 transition hover:text-primary-emphasis"
        >
          Store
        </Link>
      </div>
      <div className="divide-y divide-ink/10">
        {group.coupons.map((coupon, index) => (
          <a
            key={`${group.store.name}-${coupon.code ?? index}-${coupon.title}`}
            href={coupon.href}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 transition hover:bg-primary/5"
          >
            <span className="min-w-0">
              <span className="block line-clamp-2 text-[0.78rem] font-bold leading-4 text-primary transition group-hover:text-primary-emphasis">
                {coupon.title}
              </span>
              <span className="mt-1 block text-[0.72rem] font-semibold text-ink/52">{coupon.discount}</span>
            </span>
            <span className="self-center border border-dashed border-ink/20 bg-paper px-2.5 py-1 text-[0.68rem] font-bold uppercase text-ink">
              {coupon.code || 'Deal'}
            </span>
          </a>
        ))}
      </div>
    </article>
  );
}

function CouponGridSection({
  title,
  intro,
  coupons,
  storeLogos,
}: {
  title: string;
  intro?: string;
  coupons: Coupon[];
  storeLogos: Record<string, string | null>;
}) {
  if (coupons.length === 0) return null;

  return (
    <section className="border-b border-ink/10 py-8 last:border-b-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display !text-[1.05rem] font-bold text-ink">{title}</h2>
          {intro ? <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/55">{intro}</p> : null}
        </div>
        <Link
          href={`/search?q=${encodeURIComponent(`${title} coupons`)}`}
          className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/55 underline underline-offset-4 transition hover:text-primary"
        >
          View all
        </Link>
      </div>
      <div className="mt-5 grid overflow-hidden border-t border-ink/10 bg-white sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((coupon, index) => (
          <CouponTile
            key={`${title}-${coupon.store}-${coupon.code ?? index}-${coupon.title}`}
            coupon={coupon}
            logo={couponLogo(coupon, storeLogos)}
          />
        ))}
      </div>
    </section>
  );
}

function CouponTile({ coupon, logo }: { coupon: Coupon; logo?: string | null }) {
  const offer = coupon.code ? `${coupon.discount} with ${coupon.code}` : coupon.discount;

  return (
    <a
      href={coupon.href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="group grid min-h-[82px] grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-r border-ink/10 bg-white p-3 transition hover:bg-primary/5"
    >
      <StoreLogo name={coupon.store} logo={logo} className="h-full min-h-14 w-16" />
      <span className="min-w-0 self-center">
        <span className="block text-[0.78rem] font-bold leading-4 text-primary transition group-hover:text-primary-emphasis">
          <span className="text-ink">{coupon.store}: </span>
          {offer}
        </span>
        <span className="mt-1 block line-clamp-2 text-[0.72rem] font-medium leading-4 text-ink/62">
          {coupon.title}
        </span>
      </span>
    </a>
  );
}
