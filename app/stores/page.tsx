import Link from 'next/link';
import type { Metadata } from 'next';
import {
  countryName,
  highIntentStoreAliases,
  listCouponStores,
  storeLogoUrl,
  type CouponStore,
} from '@/lib/coupon-stores';
import { SITE } from '@/lib/site';
import PageHero from '@/components/PageHero';
import ValueStrip from '@/components/ValueStrip';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Coupon Stores',
  description: `Browse coupon stores, promo-code pages, and discount feeds on ${SITE.name}.`,
  alternates: { canonical: '/stores' },
};

type CouponStoreCard = CouponStore & {
  displayName: string;
  slug: string;
  priority: number;
};

function storeHref(store: CouponStoreCard) {
  return store.slug ? `/coupons/${store.slug}` : `/coupons/stores/${store.id}`;
}

export default async function StoresPage() {
  const cache = listCouponStores();
  const aliases = highIntentStoreAliases();
  const storesById = new Map(cache.stores.map((store) => [store.id, store]));

  const featuredStores = aliases
    .map((alias) => {
      const store = storesById.get(alias.storeId);
      if (!store) return null;
      return {
        ...store,
        displayName: alias.label || store.name,
        slug: alias.slug,
        priority: Number((alias as { priority?: number }).priority || 99),
      };
    })
    .filter((store): store is CouponStoreCard => Boolean(store))
    .sort((a, b) => a.priority - b.priority || a.displayName.localeCompare(b.displayName));

  return (
    <div data-testid="stores-page">
      <PageHero
        eyebrow="Coupon directory"
        title="Coupon Stores"
        titleClassName="text-[2rem]"
        sub="Browse popular coupon pages and promo-code feeds refreshed from the coupon cache."
      />

      <section className="mx-auto max-w-[1366px] px-6 pb-[54px] pt-[18px]">
        {featuredStores.length > 0 && (
          <div>
            <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink/10 pb-2.5">
              <h2 className="font-display !text-[1.625rem] font-bold text-ink">Popular coupon stores</h2>
              <Link href="/coupons" className="text-xs font-bold uppercase tracking-[0.14em] text-primary hover:underline">
                View coupons
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {featuredStores.map((store) => (
                <StoreCard key={store.id} store={store} featured />
              ))}
            </div>
          </div>
        )}

        {featuredStores.length === 0 && (
          <p className="mt-10 text-ink/60">No popular coupon stores yet. Update the high-intent coupon-store cache to populate this page.</p>
        )}
      </section>

      <ValueStrip />
    </div>
  );
}

function StoreCard({ store, featured = false }: { store: CouponStoreCard; featured?: boolean }) {
  const logo = storeLogoUrl(store);

  return (
    <Link
      href={storeHref(store)}
      className="flex items-center gap-3.5 rounded-[13px] border border-ink/10 bg-white p-3.5 transition hover:-translate-y-[3px] hover:border-primary hover:shadow-[0_18px_36px_-22px_rgba(13,27,42,0.4)]"
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={store.displayName} loading="lazy" referrerPolicy="no-referrer" className="h-[46px] w-[46px] flex-none rounded-[10px] object-contain p-1 mix-blend-multiply ring-1 ring-inset ring-ink/10" />
      ) : (
        <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[10px] bg-muted font-display font-bold text-ink/40">
          {store.displayName[0]}
        </span>
      )}
      <div className="min-w-0">
        <h4 className="truncate font-display !text-[1.1rem] font-semibold text-ink">{store.displayName}</h4>
        <div className="truncate text-[0.78rem] text-ink/55">{featured ? 'Coupon page' : 'Coupon store'}</div>
        <div className="mt-0.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary">{countryName(store.country)}</div>
      </div>
    </Link>
  );
}
