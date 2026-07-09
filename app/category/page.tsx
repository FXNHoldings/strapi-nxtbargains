import Link from 'next/link';
import type { Metadata } from 'next';
import { listCommerceCategories, listCommerceProducts } from '@/lib/strapi';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Product Categories',
  description: 'Browse product categories tracked by NXT.Bargains.',
  alternates: { canonical: '/category' },
};

export default async function ProductCategoriesPage() {
  const categories = await listCommerceCategories().catch(() => []);
  const counts = await Promise.all(
    categories.map((category) =>
      listCommerceProducts({ category: category.slug, pageSize: 1 })
        .then((res) => res.meta.pagination.total)
        .catch(() => 0),
    ),
  );

  const visibleCategories = categories
    .map((category, index) => ({ ...category, count: counts[index] ?? 0 }))
    .filter((category) => category.count > 0);

  return (
    <main data-testid="product-categories-page">
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">NXT.Bargains Categories</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
            Product categories.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
            Browse products by category and compare current merchant offers.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-[1366px] gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {visibleCategories.map((category) => (
            <Link
              key={category.documentId ?? category.id}
              href={`/category/${category.slug}`}
              className="group border border-ink/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {category.count} product{category.count === 1 ? '' : 's'}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink transition group-hover:text-primary">
                {category.name}
              </h2>
              {category.description ? (
                <p className="mt-3 text-sm leading-6 text-ink/60">{category.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
