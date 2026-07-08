import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { listCouponsForStore, type Coupon } from '@/lib/coupon-data';
import {
  countryName,
  couponStoreCanonicalSlug,
  couponStorePublicSlug,
  findCouponStoreBySlug,
  relatedCouponStores,
  storeCategory,
  storeLogoUrl,
} from '@/lib/coupon-stores';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = findCouponStoreBySlug(storeSlug);
  if (!store) {
    return {
      title: 'Store Coupons',
      description: 'Current store coupon codes and deals from NXT.Bargains.',
    };
  }

  return {
    title: `${store.name} Coupons, Promo Codes & Deals`,
    description: `Find current ${store.name} coupon codes, discounts, and online deals curated by NXT.Bargains.`,
    alternates: { canonical: `/coupons/${couponStoreCanonicalSlug(store)}` },
  };
}

export default async function StoreCouponsPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = findCouponStoreBySlug(storeSlug);
  if (!store) notFound();

  const [coupons, relatedStores] = await Promise.all([
    listCouponsForStore(store.id, store.name),
    Promise.resolve(relatedCouponStores(store, 8)),
  ]);
  const logo = storeLogoUrl(store);
  const category = storeCategory(store);
  const liveCodes = coupons.filter((coupon) => coupon.code).length;
  const liveDeals = Math.max(0, coupons.length - liveCodes);
  const topOffer = coupons[0]?.discount ?? 'Current offers';
  const storeUrl = store.url || (store.domain ? `https://${store.domain}` : '');
  const couponJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${store.name} Coupons`,
    url: `${SITE.url}/coupons/${couponStoreCanonicalSlug(store)}`,
    description: `Current coupon codes and deals for ${store.name}.`,
    hasPart: coupons.map((coupon) => ({
      '@type': 'Offer',
      name: coupon.title,
      category: coupon.category,
      url: coupon.href.startsWith('http') ? coupon.href : `${SITE.url}${coupon.href}`,
      description: coupon.discount,
    })),
  };

  return (
    <main className="bg-paper" data-testid="store-coupons-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(couponJsonLd) }}
      />

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-[1366px] px-6 py-10">
          <nav className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/45">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/coupons" className="hover:text-primary">Coupons</Link>
            <span>/</span>
            <span className="text-primary">{store.name}</span>
          </nav>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4">
                <StoreLogo name={store.name} logo={logo} className="h-16 w-20" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{category} coupons</p>
                  <h1 className="mt-2 font-display !text-[2.35rem] font-bold leading-tight text-ink">
                    {store.name} coupon codes and deals
                  </h1>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-base leading-7 text-ink/65">
                Browse current {store.name} promo codes, discounts, and online offers. Codes are grouped by this store
                from the coupon feed and refreshed daily when the API cache updates.
              </p>
            </div>

            <aside className="border border-ink/10 bg-paper p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Offer summary</p>
              <dl className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Live codes" value={String(liveCodes)} />
                <SummaryRow label="Live deals" value={String(liveDeals)} />
                <SummaryRow label="Top offer" value={topOffer} />
                <SummaryRow label="Country" value={countryName(store.country)} />
              </dl>
              {storeUrl ? (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  className="mt-5 inline-flex w-full justify-center bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-emphasis"
                >
                  Visit store
                </a>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1366px] gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <SectionTitle title={`Today's ${store.name} coupon codes`} />

          {coupons.length > 0 ? (
            <div className="mt-5 divide-y divide-ink/10 border border-ink/10 bg-white">
              {coupons.map((coupon, index) => (
                <CouponRow
                  key={`${coupon.store}-${coupon.code ?? index}-${coupon.title}`}
                  coupon={coupon}
                  logo={logo}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 border border-ink/10 bg-white p-6">
              <p className="font-display !text-[1.1rem] font-bold text-ink">No live coupons returned right now.</p>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                The store exists in the coupon directory, but the current coupon endpoint did not return active offers.
                Try the store link above or check back after the next refresh.
              </p>
            </div>
          )}

          <section className="mt-8 border border-ink/10 bg-white p-5">
            <SectionTitle title={`How to use ${store.name} promo codes`} compact />
            <ol className="mt-4 space-y-3 text-sm leading-6 text-ink/65">
              <li>1. Choose a live code or deal from this page.</li>
              <li>2. Open the offer and copy the promo code if one is shown.</li>
              <li>3. Add eligible items to your cart on the store website.</li>
              <li>4. Paste the code during checkout, or follow the deal link if no code is needed.</li>
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-ink/10 bg-white p-5">
            <SectionTitle title={`About ${store.name}`} compact />
            <p className="mt-3 text-sm leading-6 text-ink/62">
              {store.name} is listed in the NXT.Bargains coupon directory under {category.toLowerCase()}.
              {store.domain ? ` The store domain is ${store.domain}.` : ''}
            </p>
          </section>

          <section className="border border-ink/10 bg-white p-5">
            <SectionTitle title="Similar stores" compact />
            <div className="mt-4 space-y-3">
              {relatedStores.map((related) => (
                <Link
                  key={related.id}
                  href={`/coupons/${couponStorePublicSlug(related)}`}
                  className="group flex items-center gap-3"
                >
                  <StoreLogo name={related.name} logo={storeLogoUrl(related)} className="h-9 w-11" />
                  <span className="line-clamp-2 text-sm font-semibold text-primary transition group-hover:text-primary-emphasis">
                    {related.name} coupons
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="border border-ink/10 bg-white p-5">
            <SectionTitle title="Popular categories" compact />
            <div className="mt-4 flex flex-wrap gap-2">
              {['Electronics', 'Home and Garden', 'Fashion', 'Beauty and Health', 'Gaming'].map((name) => (
                <Link
                  key={name}
                  href={`/search?q=${encodeURIComponent(`${name} coupons`)}`}
                  className="border border-ink/10 bg-paper px-2.5 py-1.5 text-xs font-bold text-ink/62 transition hover:border-primary hover:text-primary"
                >
                  {name}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="font-semibold text-ink/50">{label}</dt>
      <dd className="max-w-[150px] text-right font-bold text-ink">{value}</dd>
    </div>
  );
}

function SectionTitle({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <h2 className={`font-display font-bold text-ink ${compact ? '!text-[1rem]' : '!text-[1.15rem]'}`}>
      {title}
    </h2>
  );
}

function StoreLogo({ name, logo, className }: { name: string; logo?: string; className: string }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={`${name} logo`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${className} shrink-0 bg-white object-contain p-2 ring-1 ring-inset ring-ink/10`}
    />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center bg-paper font-display text-sm font-extrabold uppercase text-ink ring-1 ring-inset ring-ink/10`}>
      {name.slice(0, 3)}
    </span>
  );
}

function CouponRow({ coupon, logo }: { coupon: Coupon; logo: string }) {
  return (
    <article className="grid gap-4 p-4 sm:grid-cols-[80px_minmax(0,1fr)_140px] sm:items-center">
      <StoreLogo name={coupon.store} logo={logo} className="h-14 w-16" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{coupon.code ? 'Code' : coupon.type}</p>
        <h3 className="mt-1 line-clamp-2 font-display !text-[1rem] font-bold leading-5 text-ink">{coupon.title}</h3>
        <p className="mt-2 text-sm font-semibold text-ink/55">{coupon.discount}</p>
        <p className="mt-1 text-xs font-semibold text-ink/42">{coupon.verified}</p>
      </div>
      <a
        href={coupon.href}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="inline-flex justify-center border border-primary bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-emphasis"
      >
        {coupon.code ? 'Get code' : 'Get deal'}
      </a>
    </article>
  );
}
