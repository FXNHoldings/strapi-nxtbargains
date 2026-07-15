import Link from 'next/link';
import {
  PRICE_FILTERS,
  SORT_OPTIONS,
  productPageQuery,
  type FilterOption,
  type ProductFilters,
} from '@/lib/product-filters';

type Props = {
  action: string;
  clearHref: string;
  filters: ProductFilters;
  filterOptions: {
    brands: FilterOption[];
    merchants: FilterOption[];
    availabilities: FilterOption[];
    conditions: FilterOption[];
  };
  categories?: FilterOption[];
  categoryMode?: 'select' | 'list';
  totalItems: number;
  activeFilterCount: number;
  searchPlaceholder?: string;
  className?: string;
};

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

function CategoryList({
  action,
  filters,
  categories,
}: {
  action: string;
  filters: ProductFilters;
  categories: FilterOption[];
}) {
  const allHref = `${action}${productPageQuery({ ...filters, category: '' })}`;

  return (
    <div>
      <p className="text-sm font-bold text-ink">Categories</p>
      <nav aria-label="Product categories" className="mt-2 max-h-72 overflow-y-auto border border-ink/10 bg-white">
        <Link
          href={allHref}
          className={`block border-b border-ink/8 px-3 py-2.5 text-sm font-semibold transition hover:bg-primary/5 hover:text-primary ${
            !filters.category ? 'bg-primary/5 text-primary' : 'text-ink/75'
          }`}
        >
          All categories
        </Link>
        {categories.map((category) => {
          const href = `${action}${productPageQuery({ ...filters, category: category.value })}`;
          const active = filters.category === category.value;

          return (
            <Link
              key={category.value}
              href={href}
              className={`block border-b border-ink/8 px-3 py-2.5 text-sm font-semibold transition last:border-b-0 hover:bg-primary/5 hover:text-primary ${
                active ? 'bg-primary/5 text-primary' : 'text-ink/75'
              }`}
            >
              {category.label}
              {category.count !== undefined ? (
                <span className="ml-1.5 text-xs font-medium text-ink/45">({category.count})</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function ProductFiltersSidebar({
  action,
  clearHref,
  filters,
  filterOptions,
  categories = [],
  categoryMode = 'select',
  totalItems,
  activeFilterCount,
  searchPlaceholder = 'Search products',
  className = '',
}: Props) {
  return (
    <aside className={`border border-ink/10 bg-white p-5 shadow-[0_18px_44px_-34px_rgba(13,27,42,0.28)] lg:sticky lg:top-28 ${className}`} aria-label="Product filters">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Filter</p>
        <span className="text-xs font-semibold text-ink/45">
          {activeFilterCount ? `${activeFilterCount} active` : `${totalItems} items`}
        </span>
      </div>

      <form action={action} className="mt-5 grid gap-5 border-t border-ink/10 pt-5">
        {categoryMode === 'list' && filters.category ? (
          <input type="hidden" name="category" value={filters.category} />
        ) : null}
        <div>
          <label htmlFor="product-filter-search" className="text-sm font-bold text-ink">Search</label>
          <input
            id="product-filter-search"
            name="q"
            defaultValue={filters.q}
            placeholder={searchPlaceholder}
            className="mt-2 min-h-10 w-full border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary"
          />
        </div>

        {categories.length > 0 && categoryMode === 'list' ? (
          <CategoryList action={action} filters={filters} categories={categories} />
        ) : null}

        {categories.length > 0 && categoryMode === 'select' ? (
          <FilterSelect label="Category" name="category" value={filters.category} options={categories} />
        ) : null}
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
          <Link href={clearHref} className="flex min-h-10 items-center justify-center border border-ink/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/60 transition hover:border-primary hover:text-primary">
            Clear
          </Link>
        </div>
      </form>
    </aside>
  );
}
