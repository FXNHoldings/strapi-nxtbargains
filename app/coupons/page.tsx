import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { listCouponPageData, type Coupon, type CouponBrandGroup, type Retailer } from '@/lib/coupon-data';
import { highIntentStoreAliases, listCouponStores, type CouponStore } from '@/lib/coupon-stores';
import CouponLottie from '@/components/CouponLottie';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Coupons, Promo Codes & Store Deals',
  description:
    'Find Amazon coupons, eBay promo codes, Walmart deals, store coupon pages, and category discounts curated by NXT.Bargains.',
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
  [/bestbuy/, 'bestbuy.com'],
  [/target/, 'target.com'],
  [/dell/, 'dell.com'],
  [/lenovo/, 'lenovo.com'],
  [/samsung/, 'samsung.com'],
  [/apple/, 'apple.com'],
  [/nike/, 'nike.com'],
  [/dyson/, 'dyson.com'],
  [/hp/, 'hp.com'],
];

type StoreLink = {
  name: string;
  label: string;
  href: string;
  slug: string;
  domain?: string;
  logo?: string;
};

function buildCategorySections(coupons: Coupon[]) {
  const byStore = (stores: string[]) =>
    coupons.filter((coupon) => stores.some((store) => coupon.store.toLowerCase().includes(store.toLowerCase())));
  const byCategory = (terms: string[]) =>
    coupons.filter((coupon) => terms.some((term) => `${coupon.category} ${coupon.title}`.toLowerCase().includes(term)));
  const withFill = (preferred: Coupon[], offset: number) => {
    const preferredKeys = new Set(preferred.map(couponKey));
    const filler = [...coupons.slice(offset), ...coupons.slice(0, offset)].filter((coupon) => !preferredKeys.has(couponKey(coupon)));
    return dedupeCoupons([...preferred, ...filler]).slice(0, 8);
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
      items: withFill([...byStore(['Amazon', 'Best Buy', 'Newegg', 'Dell']), ...byCategory(['electronics', 'computing', 'tech'])], 8),
    },
    {
      title: 'Clothing and fashion',
      intro: 'Fashion markdowns, sneaker promos, outlet sales, and storewide discount-code leads.',
      items: withFill([...byStore(['Nike', 'Target', 'eBay']), ...byCategory(['clothing', 'fashion', 'shoe', 'apparel'])], 16),
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

function storePageHref(name: string) {
  return `/coupons/${name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

function buildStoreLinks(retailers: Retailer[]): StoreLink[] {
  const couponStores = listCouponStores().stores;
  const storesById = new Map(couponStores.map((store) => [store.id, store]));
  const aliases = highIntentStoreAliases().map((store) => ({
    name: store.label || titleCase(store.slug),
    label: `${store.label || titleCase(store.slug)} coupons`,
    href: `/coupons/${store.slug}`,
    slug: store.slug,
    domain: storesById.get(store.storeId)?.domain || knownStoreDomain(store.label || store.slug) || undefined,
    logo: merchantLogo(storesById.get(store.storeId)),
  }));

  const retailerLinks = retailers.map((retailer) => ({
    name: retailer.name,
    label: retailer.label,
    href: retailer.href.startsWith('/coupons/') ? retailer.href : storePageHref(retailer.name),
    slug: retailer.href.startsWith('/coupons/') ? retailer.href.split('/').filter(Boolean).pop() || '' : storePageHref(retailer.name).split('/').pop() || '',
    domain: retailer.domain || knownStoreDomain(retailer.name) || undefined,
    logo: retailer.logo || undefined,
  }));

  const seen = new Set<string>();
  return [...aliases, ...retailerLinks]
    .filter((store) => {
      const key = store.slug || store.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 36);
}

function merchantLogo(store?: Pick<CouponStore, 'logo' | 'domain' | 'url'>) {
  if (!store) return undefined;
  if (store.logo) return store.logo;
  const domain = store.domain || domainFromHref(store.url);
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : undefined;
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  const storeLinks = buildStoreLinks(focusedRetailers);
  const storeLogos = Object.fromEntries(
    focusedRetailers.map((retailer) => [retailer.name.toLowerCase(), retailerLogo(retailer)]),
  );
  const featured = focusedCoupons.filter((coupon) => coupon.featured);
  const topCoupons = (featured.length > 0 ? featured : focusedCoupons).slice(0, 8);
  const categorySections = buildCategorySections(focusedCoupons);
  const topStoreLinks = storeLinks.slice(0, 12);
  const couponJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Coupons, Promo Codes & Store Deals',
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
    <main className="bg-white" data-testid="coupons-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(couponJsonLd) }}
      />

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto grid max-w-[1366px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:py-16">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-primary">
              Coupons and store deals
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl lg:text-6xl">
              Store coupon pages for codes, discounts, and current offers.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-ink/62 sm:text-lg">
              Jump straight to retailer coupon pages, compare current promo-code feeds, or search
              by category when you know what you want to buy.
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
              {topStoreLinks.slice(0, 6).map((store) => (
                <Link
                  key={store.slug}
                  href={store.href}
                  className="inline-flex border border-ink/10 bg-paper px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/65 transition hover:border-primary hover:text-primary"
                >
                  {store.name}
                </Link>
              ))}
            </div>
          </div>

          <CouponLottie />
        </div>
      </section>

      <section id="coupon-stores" className="border-b border-ink/10 bg-[#f7fafc] py-10 sm:py-12" data-testid="coupon-store-links">
        <div className="mx-auto max-w-[1366px] px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">Shop by store</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Direct coupon pages</h3>
            </div>
            <Link
              href="#coupon-stores"
              className="border border-ink/15 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink transition hover:border-primary hover:text-primary"
            >
              Store directory
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {storeLinks.slice(0, 24).map((store) => (
              <StoreLinkTile key={store.slug} store={store} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-12">
        <div className="mx-auto grid max-w-[1366px] gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <SectionHead
              eyebrow="Current offers"
              title="Today's best coupon codes"
              href="#coupon-stores"
              linkText="Browse stores"
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {topCoupons.map((coupon, index) => (
                <CouponTile
                  key={`top-${coupon.store}-${coupon.code ?? index}-${coupon.title}`}
                  coupon={coupon}
                  logo={couponLogo(coupon, storeLogos)}
                />
              ))}
            </div>
          </div>

          <aside className="border border-ink/10 bg-[#fbfcfd] p-5">
            <h3 className="font-display text-lg font-bold text-ink">Popular categories</h3>
            <div className="mt-4 grid gap-2">
              {popularCategories.slice(0, 10).map((category) => (
                <CategoryShortcut key={category} category={category} />
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-ink/10 bg-paper py-10 sm:py-12" data-testid="featured-coupons">
        <div className="mx-auto max-w-[1366px] px-6">
          {brandGroups.length > 0 ? <BrandStoresSection groups={brandGroups} /> : null}

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

function SectionHead({
  eyebrow,
  title,
  href,
  linkText,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-3">
      <div>
        {eyebrow ? <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p> : null}
        <h3 className="mt-1 font-display text-2xl font-bold text-ink">{title}</h3>
      </div>
      {href ? (
        <Link
          href={href}
          className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/55 underline underline-offset-4 transition hover:text-primary"
        >
          {linkText || 'View all'}
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

function StoreLinkTile({ store }: { store: StoreLink }) {
  const logo = store.domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(store.domain)}&sz=128`
    : store.logo || null;

  return (
    <Link
      href={store.href}
      className="group flex min-h-[74px] items-center gap-3 border border-ink/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_30px_-26px_rgba(13,27,42,0.45)]"
    >
      <StoreLogo name={store.name} logo={logo} className="h-11 w-12" />
      <span className="min-w-0">
        <span className="block truncate font-display text-sm font-bold text-ink">{store.name}</span>
        <span className="mt-0.5 block truncate text-[0.72rem] font-semibold text-primary group-hover:text-primary-emphasis">
          {store.href}
        </span>
      </span>
    </Link>
  );
}

function CategoryShortcut({ category }: { category: string }) {
  return (
    <Link href={`/search?q=${encodeURIComponent(category)}`} className="group flex min-h-10 items-center gap-3 border border-ink/8 bg-white px-3 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center bg-primary/8 font-display text-xs font-bold text-primary">
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
      <SectionHead eyebrow="Store feeds" title="Popular brand stores" href="#coupon-stores" linkText="Store links" />
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
  const href = group.store.href.startsWith('/coupons/') ? group.store.href : storePageHref(group.store.name);

  return (
    <article className="border border-ink/10 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-ink/10 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <StoreLogo name={group.store.name} logo={logo} className="h-11 w-14" />
          <div className="min-w-0">
            <h4 className="truncate font-display !text-[1rem] font-bold text-ink">{group.store.name}</h4>
            <p className="mt-0.5 text-[0.75rem] font-semibold text-ink/50">{group.coupons.length} live offers</p>
          </div>
        </div>
        <Link
          href={href}
          className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary underline underline-offset-4 transition hover:text-primary-emphasis"
        >
          Coupons
        </Link>
      </div>
      <div className="divide-y divide-ink/10">
        {group.coupons.slice(0, 4).map((coupon, index) => (
          <CouponMiniRow key={`${group.store.name}-${coupon.code ?? index}-${coupon.title}`} coupon={coupon} />
        ))}
      </div>
    </article>
  );
}

function CouponMiniRow({ coupon }: { coupon: Coupon }) {
  return (
    <div className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] gap-3 p-3">
      <span className="min-w-0">
        <span className="block line-clamp-2 text-[0.78rem] font-bold leading-4 text-primary">
          {coupon.title}
        </span>
        <span className="mt-1 block text-[0.72rem] font-semibold text-ink/52">{coupon.discount}</span>
      </span>
      <a
        href={coupon.href}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="self-center border border-dashed border-ink/20 bg-paper px-2.5 py-1 text-[0.68rem] font-bold uppercase text-ink transition hover:border-primary hover:text-primary"
      >
        {coupon.code || 'Deal'}
      </a>
    </div>
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
      <SectionHead title={title} href={`/search?q=${encodeURIComponent(`${title} coupons`)}`} />
      {intro ? <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">{intro}</p> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
  const storeHref = storePageHref(coupon.store);

  return (
    <article className="grid min-h-[176px] gap-3 border border-ink/10 bg-white p-4 transition hover:border-primary/35">
      <div className="flex items-center gap-3">
        <StoreLogo name={coupon.store} logo={logo} className="h-12 w-14" />
        <div className="min-w-0">
          <Link href={storeHref} className="block truncate text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary hover:text-primary-emphasis">
            {coupon.store} coupons
          </Link>
          <p className="mt-1 truncate text-[0.72rem] font-semibold text-ink/45">{coupon.type}</p>
        </div>
      </div>
      <div>
        <h4 className="line-clamp-2 font-display text-lg font-bold leading-5 text-ink">{coupon.discount}</h4>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/60">{coupon.title}</p>
      </div>
      <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <span className="truncate border border-dashed border-ink/20 bg-paper px-3 py-2 text-center text-xs font-bold uppercase text-ink">
          {coupon.code || 'No code'}
        </span>
        <a
          href={coupon.href}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="bg-primary px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-primary-emphasis"
        >
          Get
        </a>
      </div>
    </article>
  );
}
