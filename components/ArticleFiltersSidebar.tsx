import Link from 'next/link';
import {
  POST_TYPE_OPTIONS,
  articlePageQuery,
  type ArticleFilters,
} from '@/lib/article-filters';
import type { Section } from '@/lib/site';

type Props = {
  action: string;
  clearHref: string;
  filters: ArticleFilters;
  categories: Section[];
  currentCategory: string;
  totalItems: number;
  activeFilterCount: number;
  searchPlaceholder?: string;
  className?: string;
  hidePostType?: boolean;
};

export default function ArticleFiltersSidebar({
  action,
  clearHref,
  filters,
  categories,
  currentCategory,
  totalItems,
  activeFilterCount,
  searchPlaceholder = 'Search articles',
  className = '',
  hidePostType = false,
}: Props) {
  return (
    <aside
      className={`border border-ink/10 bg-white p-5 shadow-[0_18px_44px_-34px_rgba(13,27,42,0.28)] lg:sticky lg:top-28 ${className}`}
      aria-label="Article filters"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Filter</p>
        <span className="text-xs font-semibold text-ink/45">
          {activeFilterCount ? `${activeFilterCount} active` : `${totalItems} items`}
        </span>
      </div>

      <form action={action} className="mt-5 grid gap-5 border-t border-ink/10 pt-5">
        <div>
          <label htmlFor="article-filter-search" className="text-sm font-bold text-ink">
            Search
          </label>
          <input
            id="article-filter-search"
            name="q"
            defaultValue={filters.q}
            placeholder={searchPlaceholder}
            className="mt-2 min-h-10 w-full border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary"
          />
        </div>

        {!hidePostType ? (
          <div>
            <label htmlFor="article-filter-post-type" className="text-sm font-bold text-ink">
              Post type
            </label>
            <select
              id="article-filter-post-type"
              name="postType"
              defaultValue={filters.postType}
              className="mt-2 min-h-10 w-full border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary"
            >
              <option value="">All types</option>
              {POST_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="min-h-10 bg-ink px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary"
          >
            Apply
          </button>
          <Link
            href={clearHref}
            className="flex min-h-10 items-center justify-center border border-ink/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/60 transition hover:border-primary hover:text-primary"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="mt-6 border-t border-ink/10 pt-5">
        <p className="text-sm font-bold text-ink">Categories</p>
        <nav aria-label="Article categories" className="mt-2 max-h-72 overflow-y-auto border border-ink/10 bg-white">
          {categories.map((section) => {
            const href = `/${section.slug}${articlePageQuery(filters)}`;
            const active = currentCategory === section.slug;

            return (
              <Link
                key={section.slug}
                href={href}
                className={`block border-b border-ink/8 px-3 py-2.5 text-sm font-semibold transition last:border-b-0 hover:bg-primary/5 hover:text-primary ${
                  active ? 'bg-primary/5 text-primary' : 'text-ink/75'
                }`}
              >
                {section.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
