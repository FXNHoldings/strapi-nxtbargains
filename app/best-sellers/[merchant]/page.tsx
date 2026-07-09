import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BestSellerCard, { MARKETPLACE_LABEL } from '@/components/BestSellerCard';
import {
  BEST_SELLER_MARKETPLACES,
  getBestSellerMarketplace,
  listBestSellersForMarketplace,
} from '@/lib/best-sellers';
import { SITE } from '@/lib/site';

export const revalidate = 300;

type Params = { merchant: string };

export function generateStaticParams() {
  return BEST_SELLER_MARKETPLACES.map((marketplace) => ({ merchant: marketplace.key }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { merchant } = await params;
  const marketplace = getBestSellerMarketplace(merchant);
  if (!marketplace) return { title: 'Best Sellers' };

  return {
    title: `${marketplace.label} Best Sellers`,
    description: `Browse ${marketplace.label} best-selling product picks refreshed for ${SITE.name}.`,
    alternates: { canonical: `/best-sellers/${marketplace.key}` },
  };
}

export default async function MarketplaceBestSellersPage({ params }: { params: Promise<Params> }) {
  const { merchant } = await params;
  const marketplace = getBestSellerMarketplace(merchant);
  if (!marketplace) notFound();

  const items = listBestSellersForMarketplace(marketplace.key);

  return (
    <main data-testid={`best-sellers-${marketplace.key}-page`}>
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            <Link href="/best-sellers" className="hover:text-primary">Best Sellers</Link>
            <span>/</span>
            <span className="text-primary">{marketplace.label}</span>
          </div>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
            {marketplace.label} best sellers.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
            {marketplace.description} Prices and availability can change quickly, so confirm the final details on {marketplace.label}.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1366px] px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Current ranking</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">
                Top {MARKETPLACE_LABEL[marketplace.key]} products
              </h2>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Best seller marketplaces">
              {BEST_SELLER_MARKETPLACES.map((option) => (
                <Link
                  key={option.key}
                  href={`/best-sellers/${option.key}`}
                  className={`border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                    option.key === marketplace.key
                      ? 'border-primary bg-primary text-white'
                      : 'border-ink/15 text-ink/60 hover:border-primary hover:text-primary'
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>

          {items.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <BestSellerCard key={`${item.marketplace}-${item.asin || item.id || item.rank}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-ink/10 bg-paper p-8">
              <h2 className="font-display text-2xl font-bold text-ink">No {marketplace.label} best sellers cached yet</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">
                This page will populate after the next Best Sellers refresh writes the {marketplace.label} cache file.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
