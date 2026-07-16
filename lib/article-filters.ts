import type { NxtPostType } from '@/lib/strapi';

export type ArticleFilters = {
  q: string;
  postType: string;
};

export const POST_TYPE_OPTIONS: { value: NxtPostType; label: string }[] = [
  { value: 'product-comparison', label: 'Product Comparison' },
  { value: 'product-review', label: 'Product Review' },
  { value: 'product-roundup', label: 'Product Roundup' },
  { value: 'how-to-guide', label: 'How-to Guide' },
  { value: 'top-rated', label: 'Top Rated' },
  { value: 'informative', label: 'Informative' },
  { value: 'other', label: 'Other' },
];

function normalizeFilterValue(value?: string): string {
  return (value ?? '').trim();
}

export function articleFiltersFromSearchParams(sp: { q?: string; postType?: string } = {}): ArticleFilters {
  return {
    q: normalizeFilterValue(sp.q),
    postType: normalizeFilterValue(sp.postType),
  };
}

export function isValidPostType(value: string): value is NxtPostType {
  return POST_TYPE_OPTIONS.some((option) => option.value === value);
}

export function articlePageQuery(filters: ArticleFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.postType) params.set('postType', filters.postType);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function activeArticleFiltersCount(filters: ArticleFilters): number {
  let count = 0;
  if (filters.q) count += 1;
  if (filters.postType) count += 1;
  return count;
}
