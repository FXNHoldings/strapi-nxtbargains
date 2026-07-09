import Link from 'next/link';
import type { Metadata } from 'next';
import { BEST_SELLER_MARKETPLACES, listBestSellersForMarketplace } from '@/lib/best-sellers';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Best Sellers',
  description: 'Browse best-selling product picks by marketplace on NXT.Bargains.',
  alternates: { canonical: '/best-sellers' },
};

export default function BestSellersIndexPage() {
  const cards = BEST_SELLER_MARKETPLACES.map((marketplace) => ({
    ...marketplace,
    count: listBestSellersForMarketplace(marketplace.key).length,
  }));

  return (
    <main data-testid="best-sellers-index-page">
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">NXT.Bargains Best Sellers</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
            Best sellers by marketplace.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
            Browse refreshed product picks from Amazon, eBay, Walmart, Target, Best Buy, and Newegg.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-[1366px] gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {cards.map((marketplace) => (
            <Link
              key={marketplace.key}
              href={`/best-sellers/${marketplace.key}`}
              className="group border border-ink/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {marketplace.count > 0 ? `${marketplace.count} products` : 'Awaiting refresh'}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink transition group-hover:text-primary">
                {marketplace.label}
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink/60">{marketplace.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
