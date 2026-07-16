import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CommerceProductCard from '@/components/CommerceProductCard';
import ProductCatalogPagination from '@/components/ProductCatalogPagination';
import ProductFiltersSidebar from '@/components/ProductFiltersSidebar';
import {
  activeFiltersCount,
  applyProductFilters,
  buildFilterOptions,
  productFiltersFromSearchParams,
  productPageQuery,
  sortProducts,
} from '@/lib/product-filters';
import {
  getCommerceCategory,
  listCommerceCategories,
  listCommerceProducts,
} from '@/lib/strapi';
import { pageOpenGraph } from '@/lib/seo';

export const revalidate = 300;
export const dynamicParams = true;

const PAGE_SIZE = 12;

type Params = { slug: string };
type SearchParams = {
  page?: string;
  q?: string;
  brand?: string;
  merchant?: string;
  availability?: string;
  condition?: string;
  price?: string;
  sort?: string;
};

export async function generateStaticParams() {
  const categories = await listCommerceCategories().catch(() => []);
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCommerceCategory(slug).catch(() => null);
  if (!category) return { title: 'Product category' };

  const description = categoryPageDescription(category);
  const path = `/category/${category.slug}`;

  return {
    title: `${category.name} Products`,
    description,
    alternates: { canonical: path },
    ...pageOpenGraph({
      title: `${category.name} Products`,
      description,
      path,
    }),
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
  const sp = await searchParams;
  const { page: pageRaw } = sp;
  const page = Math.max(1, Number(pageRaw) || 1);
  const filters = productFiltersFromSearchParams(sp);

  const category = await getCommerceCategory(slug).catch(() => null);
  if (!category) notFound();

  const res = await listCommerceProducts({
    category: category.slug,
    page: 1,
    pageSize: 240,
  }).catch(() => null);

  const allProducts = res?.data ?? [];
  const filterOptions = buildFilterOptions(allProducts);
  const filteredProducts = sortProducts(applyProductFilters(allProducts, filters), filters.sort);
  const total = filteredProducts.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const products = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount = activeFiltersCount(filters);

  if (page > pageCount && total > 0) notFound();

  return (
    <main data-testid={`product-category-${category.slug}`}>
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/45" aria-label="Breadcrumb">
            <Link href="/category" className="hover:text-primary">Categories</Link>
            <span>/</span>
            <span className="text-primary">{category.name}</span>
          </nav>
          <h1 className="mt-4 max-w-4xl font-display font-bold leading-[1.08] text-ink" style={{ fontSize: '1.75rem' }}>
            {category.name}
          </h1>
          <p className="mt-6 text-base leading-8 text-ink/65 sm:text-lg">
            {categoryPageDescription(category)}
          </p>
        </div>
      </section>

      <section className="bg-white pb-12 pt-6 sm:pb-16 sm:pt-8">
        <div className="mx-auto max-w-[1366px] px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(220px,25%)_minmax(0,75%)] lg:items-start">
            <ProductFiltersSidebar
              action={`/category/${category.slug}`}
              clearHref={`/category/${category.slug}`}
              filters={filters}
              filterOptions={filterOptions}
              totalItems={allProducts.length}
              activeFilterCount={activeFilterCount}
              searchPlaceholder="Search this category"
            />

            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Product category</p>
                  <h4 className="mt-2 font-display font-bold text-ink" style={{ fontSize: '1.5rem' }}>
                    {total} {category.name} product{total === 1 ? '' : 's'}
                  </h4>
                </div>
                <Link
                  href="/products"
                  className="border border-ink/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/60 transition hover:border-primary hover:text-primary"
                >
                  All products
                </Link>
              </div>

              {products.length > 0 ? (
                <div className="product-category-grid mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
                  {products.map((product) => (
                    <CommerceProductCard
                      key={product.id}
                      product={product}
                      showCompareButton={false}
                      uniformImage
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-8 border border-ink/10 bg-paper p-8">
                  <h3 className="font-display text-2xl font-bold text-ink">No products found</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">
                    This category will populate after products are assigned to it in Strapi.
                  </p>
                </div>
              )}

              <ProductCatalogPagination
                page={page}
                pageCount={pageCount}
                pageHref={(targetPage) =>
                  `/category/${category.slug}${productPageQuery(filters, targetPage)}`
                }
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function categoryPageDescription(category: { name: string; slug: string; description?: string | null }) {
  if (category.description) return category.description;

  if (category.slug === 'smart-phones' || category.name.trim().toLowerCase() === 'smart phones') {
    return 'Compare smart phones across leading merchants, review current prices, check availability, and explore detailed product information before choosing your next device. Browse popular iPhone, Samsung Galaxy, Google Pixel, and other unlocked smartphone deals in one place.';
  }

  return `Compare ${category.name.toLowerCase()} prices and current merchant offers.`;
}
