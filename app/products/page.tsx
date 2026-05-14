import Link from 'next/link';
import type { Metadata } from 'next';
import CommerceProductCard from '@/components/CommerceProductCard';
import { listCommerceProducts } from '@/lib/strapi';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Product Prices',
  description: 'Compare live product prices and merchant offers collected by NXT.Bargains.',
  alternates: { canonical: '/products' },
};

type SearchParams = { q?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q, page: pageRaw } = await searchParams;
  const query = (q ?? '').trim();
  const page = Math.max(1, Number(pageRaw) || 1);
  const PAGE_SIZE = 24;

  const res = await listCommerceProducts({ q: query, page, pageSize: PAGE_SIZE }).catch(() => null);
  const products = res?.data ?? [];
  const total = res?.meta?.pagination?.total ?? 0;
  const pageCount = res?.meta?.pagination?.pageCount ?? 1;

  return (
    <main data-testid="products-page">
      <section className="bg-paper">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">NXT.Bargains Products</p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
                Compare merchant prices before you buy.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
                Browse products imported into the shared commerce catalog and check current offers from trusted merchants.
              </p>
            </div>

            <form action="/products" method="get" className="flex h-12 border border-ink/15 bg-white">
              <label htmlFor="product-search" className="sr-only">Search products</label>
              <input
                id="product-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search Apple iPhone 16..."
                className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-ink/40"
              />
              <button type="submit" className="bg-ink px-5 text-xs font-bold uppercase tracking-[0.14em] text-white">
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {query ? 'Search Results' : 'Latest Products'}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">
                {query ? `${total} result${total === 1 ? '' : 's'} for "${query}"` : 'Products with merchant offers'}
              </h2>
            </div>
          </div>

          {products.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <CommerceProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-ink/10 bg-paper p-8">
              <h2 className="font-display text-2xl font-bold text-ink">No products found</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">
                Try a different keyword, or add more products from the sourcing tool into the commerce catalog.
              </p>
            </div>
          )}

          {pageCount > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-3 text-sm" aria-label="Product pagination">
              {page > 1 && (
                <Link
                  href={`/products${query ? `?q=${encodeURIComponent(query)}&` : '?'}page=${page - 1}`}
                  className="inline-flex border border-ink/15 px-4 py-2 font-medium text-ink transition hover:border-primary hover:text-primary"
                >
                  Previous
                </Link>
              )}
              <span className="text-ink/55">Page {page} of {pageCount}</span>
              {page < pageCount && (
                <Link
                  href={`/products${query ? `?q=${encodeURIComponent(query)}&` : '?'}page=${page + 1}`}
                  className="inline-flex border border-ink/15 px-4 py-2 font-medium text-ink transition hover:border-primary hover:text-primary"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
