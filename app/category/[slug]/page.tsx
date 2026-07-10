import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CommerceProductCard from '@/components/CommerceProductCard';
import { bestOffer, collectOfferRows, merchantName } from '@/lib/commerce';
import {
  type CommerceProduct,
  getCommerceCategory,
  listCommerceCategories,
  listCommerceProducts,
} from '@/lib/strapi';
import { SITE } from '@/lib/site';

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

type ProductFilters = {
  q: string;
  brand: string;
  merchant: string;
  availability: string;
  condition: string;
  price: string;
  sort: string;
};

type FilterOption = {
  label: string;
  value: string;
  count?: number;
};

const PRICE_FILTERS: FilterOption[] = [
  { label: 'Under $100', value: 'under-100' },
  { label: '$100 to $250', value: '100-250' },
  { label: '$250 to $500', value: '250-500' },
  { label: '$500 to $1,000', value: '500-1000' },
  { label: '$1,000+', value: '1000-plus' },
];

const SORT_OPTIONS: FilterOption[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name: A to Z', value: 'name-asc' },
];

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
    description: categoryPageDescription(category),
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
  const sp = await searchParams;
  const { page: pageRaw } = sp;
  const page = Math.max(1, Number(pageRaw) || 1);
  const filters: ProductFilters = {
    q: normalizeFilterValue(sp.q),
    brand: normalizeFilterValue(sp.brand),
    merchant: normalizeFilterValue(sp.merchant),
    availability: normalizeFilterValue(sp.availability),
    condition: normalizeFilterValue(sp.condition),
    price: normalizeFilterValue(sp.price),
    sort: normalizeFilterValue(sp.sort),
  };

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
            <aside className="border border-ink/10 bg-paper p-5 lg:sticky lg:top-28" aria-label="Product filters">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Filter</p>
                <span className="text-xs font-semibold text-ink/45">{activeFilterCount ? `${activeFilterCount} active` : `${allProducts.length} items`}</span>
              </div>

              <form action={`/category/${category.slug}`} className="mt-5 grid gap-5 border-t border-ink/10 pt-5">
                <div>
                  <label htmlFor="category-search" className="text-sm font-bold text-ink">Search</label>
                  <input
                    id="category-search"
                    name="q"
                    defaultValue={filters.q}
                    placeholder="Search this category"
                    className="mt-2 min-h-10 w-full border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary"
                  />
                </div>

                <FilterSelect label="Brand" name="brand" value={filters.brand} options={filterOptions.brands} />
                <FilterSelect label="Store" name="merchant" value={filters.merchant} options={filterOptions.merchants} />
                <FilterSelect label="Availability" name="availability" value={filters.availability} options={filterOptions.availabilities} />
                <FilterSelect label="Condition" name="condition" value={filters.condition} options={filterOptions.conditions} />
                <FilterSelect label="Price" name="price" value={filters.price} options={PRICE_FILTERS} />
                <FilterSelect label="Sort by" name="sort" value={filters.sort} options={SORT_OPTIONS} />

                <div className="grid grid-cols-2 gap-2">
                  <button type="submit" className="min-h-10 bg-ink px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary">
                    Apply
                  </button>
                  <Link href={`/category/${category.slug}`} className="flex min-h-10 items-center justify-center border border-ink/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/60 transition hover:border-primary hover:text-primary">
                    Clear
                  </Link>
                </div>
              </form>
            </aside>

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
                <div className="mt-8 grid gap-[5px] sm:grid-cols-2 lg:grid-cols-4">
                  {products.map((product) => (
                    <CommerceProductCard key={product.id} product={product} showCompareButton={false} />
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

              {page < pageCount && (
                <div className="mt-12 flex flex-wrap justify-center gap-3">
                  <Link
                    href={`/category/${category.slug}${nextPageQuery(filters, page + 1)}`}
                    className="inline-flex min-h-11 items-center justify-center bg-ink px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary"
                  >
                    View more
                  </Link>
                  <Link
                    href={`/category/${category.slug}${nextPageQuery(filters, page + 1)}`}
                    className="inline-flex min-h-11 items-center justify-center border border-ink/15 px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-ink/70 transition hover:border-primary hover:text-primary"
                  >
                    Next
                  </Link>
                </div>
              )}
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

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: keyof ProductFilters;
  value: string;
  options: FilterOption[];
}) {
  return (
    <div>
      <label htmlFor={`filter-${name}`} className="text-sm font-bold text-ink">{label}</label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value}
        className="mt-2 min-h-10 w-full border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}{option.count !== undefined ? ` (${option.count})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function buildFilterOptions(products: CommerceProduct[]) {
  const brands = new Map<string, FilterOption>();
  const merchants = new Map<string, FilterOption>();
  const availabilities = new Map<string, FilterOption>();
  const conditions = new Map<string, FilterOption>();

  for (const product of products) {
    const brand = product.brandRef?.name || product.brand;
    if (brand) incrementOption(brands, brand, brand);

    for (const row of collectOfferRows(product)) {
      const offer = row.offer;
      const merchantSlug = offer.merchant?.slug;
      const merchantLabel = merchantName(offer);
      if (merchantSlug && merchantLabel) incrementOption(merchants, merchantSlug, merchantLabel);
      if (offer.availability) incrementOption(availabilities, offer.availability, formatFilterLabel(offer.availability));
      if (offer.condition) incrementOption(conditions, offer.condition, formatFilterLabel(offer.condition));
    }
  }

  return {
    brands: sortOptions(Array.from(brands.values())),
    merchants: sortOptions(Array.from(merchants.values())),
    availabilities: sortOptions(Array.from(availabilities.values())),
    conditions: sortOptions(Array.from(conditions.values())),
  };
}

function applyProductFilters(products: CommerceProduct[], filters: ProductFilters) {
  return products.filter((product) => {
    const rows = collectOfferRows(product);
    const searchable = [
      product.name,
      product.brand,
      product.brandRef?.name,
      product.category,
      product.shortDescription,
      product.categories?.map((item) => item.name).join(' '),
      rows.map((row) => merchantName(row.offer)).join(' '),
    ].filter(Boolean).join(' ').toLowerCase();

    if (filters.q && !searchable.includes(filters.q.toLowerCase())) return false;
    if (filters.brand && (product.brandRef?.name || product.brand || '') !== filters.brand) return false;
    if (filters.merchant && !rows.some((row) => row.offer.merchant?.slug === filters.merchant)) return false;
    if (filters.availability && !rows.some((row) => row.offer.availability === filters.availability)) return false;
    if (filters.condition && !rows.some((row) => row.offer.condition === filters.condition)) return false;
    if (filters.price && !priceMatchesFilter(bestProductPrice(product), filters.price)) return false;

    return true;
  });
}

function sortProducts(products: CommerceProduct[], sort: string) {
  const sorted = [...products];
  if (sort === 'price-asc') {
    sorted.sort((a, b) => (bestProductPrice(a) ?? Number.POSITIVE_INFINITY) - (bestProductPrice(b) ?? Number.POSITIVE_INFINITY));
  } else if (sort === 'price-desc') {
    sorted.sort((a, b) => (bestProductPrice(b) ?? Number.NEGATIVE_INFINITY) - (bestProductPrice(a) ?? Number.NEGATIVE_INFINITY));
  } else if (sort === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''));
  }
  return sorted;
}

function bestProductPrice(product: CommerceProduct) {
  const best = bestOffer(collectOfferRows(product));
  return numericValue(best?.offer.price ?? best?.offer.originalPrice);
}

function priceMatchesFilter(price: number | null, filter: string) {
  if (price === null) return false;
  if (filter === 'under-100') return price < 100;
  if (filter === '100-250') return price >= 100 && price <= 250;
  if (filter === '250-500') return price >= 250 && price <= 500;
  if (filter === '500-1000') return price >= 500 && price <= 1000;
  if (filter === '1000-plus') return price >= 1000;
  return true;
}

function nextPageQuery(filters: ProductFilters, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  params.set('page', String(page));
  return `?${params.toString()}`;
}

function activeFiltersCount(filters: ProductFilters) {
  return Object.entries(filters).filter(([key, value]) => key !== 'sort' && Boolean(value)).length;
}

function incrementOption(map: Map<string, FilterOption>, value: string, label: string) {
  const existing = map.get(value);
  if (existing) {
    existing.count = (existing.count ?? 0) + 1;
  } else {
    map.set(value, { value, label, count: 1 });
  }
}

function sortOptions(options: FilterOption[]) {
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function normalizeFilterValue(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatFilterLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function numericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
