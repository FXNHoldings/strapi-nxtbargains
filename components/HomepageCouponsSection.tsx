import Link from 'next/link';
import type { Coupon, CouponBrandGroup, Retailer } from '@/lib/coupon-data';
import {
  couponStoreSlug,
  findCouponStoreBySlug,
  highIntentStoreAliases,
  listCouponStores,
  storeLogoUrl,
} from '@/lib/coupon-stores';

const popularCategories = [
  { label: 'Electronics', query: 'electronics coupon codes' },
  { label: 'Computing', query: 'computing discounts' },
  { label: 'Home & garden', query: 'home and garden coupons' },
  { label: 'Fashion', query: 'fashion promo codes' },
  { label: 'Beauty & health', query: 'beauty and health offers' },
  { label: 'Gaming', query: 'gaming deals' },
  { label: 'Sports & outdoors', query: 'sports and outdoors coupons' },
  { label: 'Mobile & wireless', query: 'mobile and wireless codes' },
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

const sourceStoreLogos: Array<[RegExp, string]> = [
  [/amazon/, '/logos/amazon-logo.svg'],
  [/ebay/, '/logos/ebay-logo.svg'],
  [/walmart/, '/logos/walmart-logo.svg'],
  [/newegg/, '/logos/newegg-logo.svg'],
  [/hp/, '/logos/hp-logo.svg'],
  [/dell/, '/logos/dell-logo.svg'],
  [/lenovo/, '/logos/lenovo-logo.svg'],
  [/samsung/, '/logos/samsung-logo.svg'],
  [/apple/, '/logos/apple-logo.svg'],
  [/target/, '/logos/target-logo.svg'],
  [/nike/, '/logos/nike-logo.svg'],
  [/argos/, '/logos/argos-logo.svg'],
];

type Props = {
  coupons: Coupon[];
  retailers: Retailer[];
  brandGroups: CouponBrandGroup[];
};

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

function storePageHref(name: string) {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === 'amazon' ? '/coupons/amazon' : `/coupons/${slug}`;
}

function sourceLogoForStore(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sourceStoreLogos.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
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

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function domainFromStoreName(name: string) {
  const trimmed = name.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if (/\.[a-z]{2,}(?:\.[a-z]{2,})?$/i.test(trimmed.split('/')[0] || '')) {
    return (trimmed.split('/')[0] || '').toLowerCase();
  }
  return knownStoreDomain(name);
}

function retailerLogo(retailer: Pick<Retailer, 'name' | 'logo' | 'domain' | 'href'>) {
  const sourceLogo = sourceLogoForStore(retailer.name);
  if (sourceLogo) return sourceLogo;

  const domain = retailer.domain || domainFromStoreName(retailer.name) || domainFromHref(retailer.href);
  return domain ? faviconUrl(domain) : null;
}

function buildStoreLogoLookup() {
  const lookup = new Map<string, string>();
  const add = (key: string, logo: string) => {
    const normalized = key.trim().toLowerCase();
    if (normalized && logo) lookup.set(normalized, logo);
  };

  for (const store of listCouponStores().stores) {
    const logo = storeLogoUrl(store);
    if (!logo) continue;
    add(store.name, logo);
    add(couponStoreSlug(store.name), logo);
    if (store.domain) {
      add(store.domain, logo);
      add(store.domain.split('.')[0] || '', logo);
    }
  }

  const storesById = new Map(listCouponStores().stores.map((store) => [store.id, store]));
  for (const alias of highIntentStoreAliases()) {
    const store = storesById.get(alias.storeId);
    if (!store) continue;
    const logo = storeLogoUrl(store);
    if (!logo) continue;
    add(alias.slug, logo);
    if (alias.label) add(alias.label, logo);
  }

  return lookup;
}

function couponLogo(
  coupon: Coupon,
  storeLogos: Record<string, string | null>,
  storeLogoLookup: Map<string, string>,
) {
  const key = coupon.store.toLowerCase();
  const slug = couponStoreSlug(coupon.store);
  const normalized = key.replace(/[^a-z0-9]/g, '');
  const sourceLogo = sourceLogoForStore(coupon.store);
  if (sourceLogo) return sourceLogo;

  const direct =
    storeLogoLookup.get(key) ||
    storeLogoLookup.get(slug) ||
    storeLogos[key] ||
    null;
  if (direct) return direct;

  const matchedStore = findCouponStoreBySlug(slug);
  if (matchedStore) {
    const logo = storeLogoUrl(matchedStore);
    if (logo) return logo;
  }

  const domain =
    domainFromStoreName(coupon.store) ||
    domainFromHref(coupon.href) ||
    [...storeLogoLookup.entries()].find(([name]) => {
      const candidate = name.replace(/[^a-z0-9]/g, '');
      return candidate.length > 2 && (normalized.includes(candidate) || candidate.includes(normalized));
    })?.[0];
  if (domain) {
    const fromLookup = storeLogoLookup.get(domain) || storeLogoLookup.get(domain.replace(/[^a-z0-9]/g, ''));
    if (fromLookup) return fromLookup;
    const parsedDomain = domain.includes('.') ? domain : knownStoreDomain(coupon.store);
    if (parsedDomain) return faviconUrl(parsedDomain);
  }

  const fuzzy = Object.entries(storeLogos).find(([store]) => store.includes(key) || key.includes(store));
  return fuzzy?.[1] ?? null;
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 font-display font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-3 text-sm leading-7 text-ink/60 sm:text-base">{subtitle}</p>}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 border border-ink/15 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink transition hover:border-primary hover:text-primary"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function StoreLogo({ name, logo, className = 'h-9 w-12' }: { name: string; logo?: string | null; className?: string }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={`${name} logo`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${className} shrink-0 rounded-lg bg-white object-contain`}
    />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center rounded-lg bg-paper font-display text-[0.78rem] font-extrabold uppercase text-ink`}>
      {name.slice(0, 3)}
    </span>
  );
}

function CategoryShortcut({ label, query }: { label: string; query: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(query)}`}
      className="coupon-category-shortcut group flex min-h-10 items-center gap-3 border border-ink/8 bg-white px-3 py-2 transition hover:border-primary/30"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-primary/8 font-display text-xs font-bold text-primary">
        {label.charAt(0)}
      </span>
      <span className="line-clamp-2 text-[0.82rem] font-semibold leading-4 text-ink/75 transition group-hover:text-primary">
        {label}
      </span>
    </Link>
  );
}

function CouponTile({
  coupon,
  logo,
  emphasizeLogo = false,
}: {
  coupon: Coupon;
  logo?: string | null;
  emphasizeLogo?: boolean;
}) {
  const href = storePageHref(coupon.store);
  const logoSize = emphasizeLogo ? 'h-14 w-16' : 'h-12 w-14';

  return (
    <article className="coupon-tile grid min-h-[176px] gap-3 border border-ink/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_28px_-20px_rgba(13,27,42,0.35)]">
      <div className="flex items-center gap-3">
        <StoreLogo name={coupon.store} logo={logo} className={logoSize} />
        <div className="min-w-0">
          <Link href={href} className="block truncate text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary hover:text-primary-emphasis">
            {coupon.store} coupons
          </Link>
          <p className="mt-1 truncate text-[0.72rem] font-semibold text-ink/45">{coupon.type}</p>
        </div>
      </div>
      <div>
        <h5 className="line-clamp-2 font-display text-lg font-bold leading-5 text-ink">{coupon.discount}</h5>
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
          Get deal
        </a>
      </div>
    </article>
  );
}

export default function HomepageCouponsSection({ coupons, retailers, brandGroups }: Props) {
  const focusedCoupons = dedupeCoupons([
    ...brandGroups.flatMap((group) => group.coupons),
    ...coupons,
  ]);
  if (focusedCoupons.length === 0) return null;

  const focusedRetailers = brandGroups.length > 0
    ? brandGroups.map((group) => group.store)
    : retailers;
  const storeLogos = Object.fromEntries(
    focusedRetailers.map((retailer) => [retailer.name.toLowerCase(), retailerLogo(retailer)]),
  );
  const storeLogoLookup = buildStoreLogoLookup();
  const featured = focusedCoupons.filter((coupon) => coupon.featured);
  const topCoupons = (featured.length > 0 ? featured : focusedCoupons).slice(0, 8);

  return (
    <section className="pb-14 sm:pb-[72px]" data-testid="home-coupons">
      <div className="mx-auto max-w-[1366px] px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <SectionHead
              eyebrow="Current offers"
              title="Today's best coupon codes"
              subtitle="Verified promo codes and discount leads from our live coupon feed — the same data shown on the coupons page."
              action={{ href: '/coupons', label: 'All coupons' }}
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {topCoupons.map((coupon, index) => (
                <CouponTile
                  key={`top-${coupon.store}-${coupon.code ?? index}-${coupon.title}`}
                  coupon={coupon}
                  logo={couponLogo(coupon, storeLogos, storeLogoLookup)}
                  emphasizeLogo
                />
              ))}
            </div>
          </div>

          <aside className="coupon-sidebar h-fit border border-ink/10 bg-[#fbfcfd] p-5">
            <h3 className="font-display text-lg font-bold text-ink">Shop by category</h3>
            <p className="mt-2 text-sm text-ink/55">Search coupon codes by product category.</p>
            <div className="mt-4 grid gap-2">
              {popularCategories.map((cat) => (
                <CategoryShortcut key={cat.label} label={cat.label} query={cat.query} />
              ))}
            </div>
            <Link
              href="/brands"
              className="mt-5 flex items-center justify-between border border-ink/10 bg-white px-4 py-3 text-sm font-bold text-primary transition hover:border-primary"
            >
              Browse all brands
              <span aria-hidden>→</span>
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
