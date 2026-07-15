import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BestSellerCard, { MARKETPLACE_LABEL } from '@/components/BestSellerCard';
import {
  BEST_SELLER_MARKETPLACES,
  getBestSellerMarketplace,
  listBestSellerCategoryGroupsForMarketplace,
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
  const categoryGroups = listBestSellerCategoryGroupsForMarketplace(marketplace.key);
  const showCategoryGroups = categoryGroups.length > 1 || categoryGroups[0]?.key !== 'top-products';

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

      <section className="bg-white pb-12 pt-6 sm:pb-16 sm:pt-8">
        <div className="mx-auto max-w-[1366px] px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Current ranking</p>
              <h4 className="mt-2 font-display text-2xl font-bold text-ink">
                Top {MARKETPLACE_LABEL[marketplace.key]} products
              </h4>
            </div>
            <nav className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible" aria-label="Best seller marketplaces">
              {BEST_SELLER_MARKETPLACES.map((option) => (
                <Link
                  key={option.key}
                  href={`/best-sellers/${option.key}`}
                  className={`best-seller-tab shrink-0 ${option.key === marketplace.key ? 'best-seller-tab-active' : ''}`}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>

          {showCategoryGroups && (
            <nav className="mt-6 flex max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" aria-label={`${marketplace.label} best seller categories`}>
              {categoryGroups.map((group, index) => (
                <Link
                  key={`category-tab-${group.key}`}
                  href={`#best-sellers-${marketplace.key}-${group.key}`}
                  className={`best-seller-tab shrink-0 ${index === 0 ? 'best-seller-tab-active' : ''}`}
                >
                  {group.label}
                </Link>
              ))}
            </nav>
          )}

          {items.length > 0 ? (
            showCategoryGroups ? (
              <div className="mt-8 space-y-12">
                {categoryGroups.map((group) => (
                  <section key={group.key} aria-labelledby={`best-sellers-${marketplace.key}-${group.key}`}>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{group.items.length} products</p>
                        <h3 id={`best-sellers-${marketplace.key}-${group.key}`} className="mt-2 font-display text-2xl font-bold text-ink">
                          {group.label}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.items.map((item) => (
                        <BestSellerCard key={`${group.key}-${item.marketplace}-${item.asin || item.id || item.rank}`} item={item} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <BestSellerCard key={`${item.marketplace}-${item.asin || item.id || item.rank}`} item={item} />
                ))}
              </div>
            )
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
