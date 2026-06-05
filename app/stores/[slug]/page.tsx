import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listStoreProducts } from '@/lib/strapi';
import { bestOffer, collectOfferRows, offerPrice } from '@/lib/commerce';
import { SITE } from '@/lib/site';
import CommerceProductCard from '@/components/CommerceProductCard';
import StoreFilter, { type StoreFilterItem } from '@/components/StoreFilter';

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { store } = await listStoreProducts(slug).catch(() => ({ store: null, products: [] }));
  const name = store?.name ?? 'Store';
  return {
    title: `${name} — Prices & Products`,
    description: `Products available at ${name}, price-compared across marketplaces on ${SITE.name}.`,
    alternates: { canonical: `/stores/${slug}` },
  };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, products } = await listStoreProducts(slug).catch(() => ({ store: null, products: [] }));
  if (!store) notFound();

  // Server-render each card + its filter metadata, then hand off to the client
  // filter component (cards can't be built inside a client component).
  const filterItems: StoreFilterItem[] = products.map((p) => {
    const best = bestOffer(collectOfferRows(p));
    const categories = (p.categories?.map((c) => c.name).filter(Boolean) as string[]) ?? [];
    if (!categories.length && p.category) categories.push(p.category);
    return {
      key: String(p.id),
      card: <CommerceProductCard product={p} />,
      name: p.name,
      categories,
      brand: p.brandRef?.name ?? p.brand ?? null,
      price: best ? offerPrice(best.offer) : null,
    };
  });

  return (
    <main className="bg-white" data-testid={`store-${store.slug}`}>
      {/* Full-width store header */}
      <section className="border-b border-ink/10 bg-paper">
        <div className="mx-auto max-w-[1420px] px-4 py-8 sm:px-6">
          <Link href="/stores" className="text-xs font-bold uppercase tracking-wider text-primary">← All stores</Link>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            {store.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logo} alt={store.name} referrerPolicy="no-referrer" className="h-16 w-16 rounded-lg border border-ink/10 bg-white object-contain p-2" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-ink/10 bg-muted font-display text-2xl font-bold text-ink/40">{store.name[0]}</span>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold text-ink">{store.name}</h1>
              <p className="mt-1 text-sm text-ink/55">
                {products.length} product{products.length === 1 ? '' : 's'} compared
                {store.websiteUrl ? (
                  <>
                    {' · '}
                    <a href={store.websiteUrl} target="_blank" rel="nofollow noopener noreferrer" className="text-primary hover:underline">visit site ↗</a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters (left, 25%) + products (right, 75%). Filter UI is client-side. */}
      <div className="mx-auto max-w-[1420px] px-4 py-10 sm:px-6">
        {products.length === 0 ? (
          <p className="text-ink/60">No products from this store yet.</p>
        ) : (
          <StoreFilter items={filterItems} />
        )}
      </div>
    </main>
  );
}
