import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CommerceProductCard from '@/components/CommerceProductCard';
import {
  getCommerceCategory,
  listCommerceCategories,
  listCommerceProducts,
} from '@/lib/strapi';
import { SITE } from '@/lib/site';

export const revalidate = 300;
export const dynamicParams = true;

const PAGE_SIZE = 24;

type Params = { slug: string };
type SearchParams = { page?: string };

export async function generateStaticParams() {
  const categories = await listCommerceCategories().catch(() => []);
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCommerceCategory(slug).catch(() => null);
  if (!category) return { title: 'Product category' };

  return {
    title: `${category.name} Products`,
    description: category.description || `Compare ${category.name} prices and merchant offers on ${SITE.name}.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function ProductCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const category = await getCommerceCategory(slug).catch(() => null);
  if (!category) notFound();

  const res = await listCommerceProducts({
    category: category.slug,
    page,
    pageSize: PAGE_SIZE,
  }).catch(() => null);

  const products = res?.data ?? [];
  const total = res?.meta.pagination.total ?? 0;
  const pageCount = res?.meta.pagination.pageCount ?? 1;

  if (page > 1 && products.length === 0) notFound();

  return (
    <main data-testid={`product-category-${category.slug}`}>
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-4 py-12 sm:px-6 sm:py-16">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/45" aria-label="Breadcrumb">
            <Link href="/category" className="hover:text-primary">Categories</Link>
            <span>/</span>
            <span className="text-primary">{category.name}</span>
          </nav>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
            {category.description || `Compare ${category.name.toLowerCase()} prices and current merchant offers.`}
          </p>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1366px] px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Product category</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">
                {total} {category.name} product{total === 1 ? '' : 's'}
              </h2>
            </div>
            <Link
              href="/products"
              className="border border-ink/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/60 transition hover:border-primary hover:text-primary"
            >
              All products
            </Link>
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
                This category will populate after products are assigned to it in Strapi.
              </p>
            </div>
          )}

          {pageCount > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-3 text-sm" aria-label="Product category pagination">
              {page > 1 && (
                <Link
                  href={`/category/${category.slug}${page - 1 > 1 ? `?page=${page - 1}` : ''}`}
                  className="inline-flex border border-ink/15 px-4 py-2 font-medium text-ink transition hover:border-primary hover:text-primary"
                >
                  Previous
                </Link>
              )}
              <span className="text-ink/55">Page {page} of {pageCount}</span>
              {page < pageCount && (
                <Link
                  href={`/category/${category.slug}?page=${page + 1}`}
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
