import qs from 'qs';

const BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN;

export type StrapiImage = { url: string; alternativeText?: string; width?: number; height?: number } | null;

export type NxtPostType =
  | 'product-comparison'
  | 'product-review'
  | 'product-roundup'
  | 'how-to-guide'
  | 'informative'
  | 'top-rated'
  | 'other';

export type NxtCategory = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string;
  order?: number;
  icon?: string;
  legacyWpId?: number;
  parent?: { id: number; name: string; slug: string } | null;
  children?: { id: number; name: string; slug: string }[];
};

export type PostPriceComparisonOffer = {
  merchantSlug: string;
  merchantName: string;
  productName: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  productUrl?: string;
  affiliateUrl?: string;
  price?: number | string | null;
  originalPrice?: number | string | null;
  currency?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  condition?: 'new' | 'used' | 'refurbished' | 'open_box' | 'unknown';
  source?: string;
};

export type PostPriceComparisonSnapshot = {
  keyword?: string;
  generatedAt?: string;
  source?: string;
  mode?: string;
  message?: string;
  rawCount?: number;
  perMerchantLimit?: number;
  results?: PostPriceComparisonOffer[];
};

export type NxtPost = {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  postType?: NxtPostType;
  amazonAffiliateTag?: string;
  priceComparisonEnabled?: boolean;
  priceComparisonKeyword?: string;
  priceComparisonMerchantLimit?: number;
  priceComparisonStatus?: 'idle' | 'success' | 'failed';
  priceComparisonLastRunAt?: string;
  priceComparisonError?: string | null;
  priceComparisonResults?: PostPriceComparisonSnapshot | null;
  sourceUrl?: string;
  legacyWpId?: number;
  readingTimeMinutes?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  publishedAt: string;
  updatedAt: string;
  coverImage?: StrapiImage;
  ogImage?: StrapiImage;
  gallery?: NonNullable<StrapiImage>[];
  categories?: NxtCategory[];
};

export type CommerceBrand = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  websiteUrl?: string | null;
  country?: string | null;
  status?: 'active' | 'draft' | 'archived';
};

export type CommerceCategory = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  status?: 'active' | 'draft' | 'archived';
};

export type CommerceMerchant = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  websiteUrl?: string | null;
  logo?: StrapiImage;
  country?: string | null;
  affiliateNetwork?: string | null;
  status?: 'active' | 'inactive';
};

export type CommerceOffer = {
  id: number;
  documentId?: string;
  title?: string | null;
  price?: number | string | null;
  originalPrice?: number | string | null;
  currency?: string | null;
  discountPercent?: number | string | null;
  productUrl: string;
  affiliateUrl?: string | null;
  couponCode?: string | null;
  availability?: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  shippingCost?: number | string | null;
  condition?: 'new' | 'used' | 'refurbished' | 'open_box' | 'unknown';
  merchantSku?: string | null;
  source?: string | null;
  lastCheckedAt?: string | null;
  status?: 'active' | 'expired' | 'stale' | 'error';
  displayOrder?: number | null;
  merchant?: CommerceMerchant | null;
};

export type CommercePriceSnapshot = {
  id: number;
  documentId?: string;
  price?: number | string | null;
  originalPrice?: number | string | null;
  currency?: string | null;
  availability?: CommerceOffer['availability'];
  checkedAt: string;
  source?: string | null;
  merchant?: CommerceMerchant | null;
};

export type CommerceProduct = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  brand?: string | null;
  brandRef?: CommerceBrand | null;
  shortDescription?: string | null;
  description?: string | null;
  primaryImage?: StrapiImage;
  gallery?: NonNullable<StrapiImage>[];
  category?: string | null;
  categories?: CommerceCategory[];
  tags?: string[] | null;
  specs?: Record<string, unknown> | null;
  asin?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  sku?: string | null;
  rating?: number | string | null;
  ratingCount?: number | null;
  status?: 'active' | 'draft' | 'archived';
  offers?: CommerceOffer[];
  publishedAt?: string;
  updatedAt: string;
  createdAt?: string;
};

type ListResponse<T> = {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
};

async function strapiFetch<T>(path: string, params?: Record<string, unknown>, revalidate = 60): Promise<T> {
  const query = params ? '?' + qs.stringify(params, { encodeValuesOnly: true }) : '';
  const url = `${BASE}/api/${path}${query}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Strapi ${res.status} on ${url}: ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

export function mediaUrl(img: StrapiImage): string | null {
  if (!img?.url) return null;
  return img.url.startsWith('http') ? img.url : `${BASE}${img.url}`;
}

const POST_POPULATE = ['coverImage', 'ogImage', 'categories', 'gallery'];
const COMMERCE_PRODUCT_POPULATE = {
  primaryImage: true,
  gallery: true,
  brandRef: true,
  categories: true,
  offers: {
    populate: {
      merchant: {
        populate: {
          logo: true,
        },
      },
    },
  },
};

export async function listPosts(
  opts: { page?: number; pageSize?: number; category?: string; postType?: NxtPostType; q?: string } = {},
) {
  const filters: Record<string, unknown> = {};
  if (opts.category) filters.categories = { slug: { $eqi: opts.category } };
  if (opts.postType) filters.postType = { $eq: opts.postType };
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    filters.$or = [
      { title: { $containsi: q } },
      { excerpt: { $containsi: q } },
      { content: { $containsi: q } },
      { categories: { name: { $containsi: q } } },
    ];
  }

  return strapiFetch<ListResponse<NxtPost>>('nxt-posts', {
    sort: ['publishedAt:desc'],
    populate: POST_POPULATE,
    pagination: { page: opts.page ?? 1, pageSize: opts.pageSize ?? 12 },
    filters,
  });
}

export async function getPost(slug: string): Promise<NxtPost | null> {
  const res = await strapiFetch<ListResponse<NxtPost>>('nxt-posts', {
    filters: { slug: { $eq: slug } },
    populate: POST_POPULATE,
    pagination: { pageSize: 1 },
  });
  return res.data?.[0] ?? null;
}

export async function listCategories(): Promise<NxtCategory[]> {
  const res = await strapiFetch<ListResponse<NxtCategory>>('nxt-categories', {
    sort: ['order:asc', 'name:asc'],
    populate: ['parent', 'children'],
    pagination: { pageSize: 100 },
  });
  return res.data;
}

export async function getCategory(slug: string): Promise<NxtCategory | null> {
  const res = await strapiFetch<ListResponse<NxtCategory>>('nxt-categories', {
    filters: { slug: { $eqi: slug } },
    populate: ['parent', 'children'],
    pagination: { pageSize: 1 },
  });
  return res.data?.[0] ?? null;
}

export async function listCommerceProducts(
  opts: { page?: number; pageSize?: number; q?: string } = {},
) {
  const filters: Record<string, unknown> = { status: { $eq: 'active' } };
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    filters.$or = [
      { name: { $containsi: q } },
      { brand: { $containsi: q } },
      { category: { $containsi: q } },
      { shortDescription: { $containsi: q } },
      { brandRef: { name: { $containsi: q } } },
      { categories: { name: { $containsi: q } } },
      { offers: { merchant: { name: { $containsi: q } } } },
    ];
  }

  return strapiFetch<ListResponse<CommerceProduct>>('commerce-products', {
    sort: ['updatedAt:desc'],
    populate: COMMERCE_PRODUCT_POPULATE,
    pagination: { page: opts.page ?? 1, pageSize: opts.pageSize ?? 24 },
    filters,
  });
}

export async function getCommerceProduct(slug: string): Promise<CommerceProduct | null> {
  const res = await strapiFetch<ListResponse<CommerceProduct>>('commerce-products', {
    filters: { slug: { $eq: slug }, status: { $eq: 'active' } },
    populate: COMMERCE_PRODUCT_POPULATE,
    pagination: { pageSize: 1 },
  });
  return res.data?.[0] ?? null;
}

export async function listCommercePriceSnapshots(
  productDocumentIds: string[],
  pageSize = 240,
): Promise<CommercePriceSnapshot[]> {
  const ids = Array.from(new Set(productDocumentIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const res = await strapiFetch<ListResponse<CommercePriceSnapshot>>(
    'commerce-price-snapshots',
    {
      filters: {
        product: {
          documentId: ids.length === 1 ? { $eq: ids[0] } : { $in: ids },
        },
      },
      populate: {
        merchant: {
          fields: ['name', 'slug'],
        },
      },
      sort: ['checkedAt:asc'],
      pagination: { pageSize },
    },
    300,
  );
  return res.data;
}

export async function listSimilarCommerceProducts(
  product: Pick<CommerceProduct, 'name' | 'brand' | 'brandRef'>,
  pageSize = 24,
): Promise<CommerceProduct[]> {
  const tokens = productMatchTokens(product);
  if (tokens.length < 2) return [];

  const res = await strapiFetch<ListResponse<CommerceProduct>>('commerce-products', {
    filters: {
      status: { $eq: 'active' },
      $and: tokens.map((token) => ({ name: { $containsi: token } })),
    },
    populate: COMMERCE_PRODUCT_POPULATE,
    sort: ['updatedAt:desc'],
    pagination: { pageSize },
  });
  return res.data;
}

export async function listAllCommerceProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const all: { slug: string; updatedAt: string }[] = [];
  let page = 1;
  while (true) {
    const res = await strapiFetch<ListResponse<CommerceProduct>>('commerce-products', {
      fields: ['slug', 'updatedAt'],
      filters: { status: { $eq: 'active' } },
      sort: ['updatedAt:desc'],
      pagination: { page, pageSize: 100 },
    });
    for (const product of res.data) {
      all.push({ slug: product.slug, updatedAt: product.updatedAt });
    }
    const pageCount = res.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }
  return all;
}

// Slug→category lookup for sitemap, etc.
export async function listAllPostSlugs(): Promise<{ slug: string; category: string; updatedAt: string }[]> {
  const all: { slug: string; category: string; updatedAt: string }[] = [];
  let page = 1;
  while (true) {
    const res = await strapiFetch<ListResponse<NxtPost>>('nxt-posts', {
      fields: ['slug', 'updatedAt'],
      populate: { categories: { fields: ['slug'] } },
      sort: ['publishedAt:desc'],
      pagination: { page, pageSize: 100 },
    });
    for (const p of res.data) {
      const cat = p.categories?.[0]?.slug ?? 'uncategorized';
      all.push({ slug: p.slug, category: cat, updatedAt: p.updatedAt });
    }
    const pageCount = res.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }
  return all;
}

const KNOWN_BRANDS = [
  'apple',
  'samsung',
  'sony',
  'microsoft',
  'nintendo',
  'google',
  'amazon',
  'lg',
  'hp',
  'dell',
  'lenovo',
  'asus',
  'acer',
  'bose',
  'jbl',
  'anker',
];

const PRODUCT_TOKEN_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'all',
  'at',
  'battery',
  'black',
  'blue',
  'box',
  'cellular',
  'condition',
  'for',
  'factory',
  'gb',
  'gray',
  'green',
  'in',
  'lte',
  'new',
  'on',
  'open',
  'owned',
  'pink',
  'pre',
  'preowned',
  'red',
  'silver',
  'the',
  'tm',
  'to',
  'unlocked',
  'used',
  'white',
  'with',
]);

function tokenizeProductName(value?: string | null): string[] {
  return (value ?? '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 1 && !PRODUCT_TOKEN_STOPWORDS.has(token)) ?? [];
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

function productMatchTokens(product: Pick<CommerceProduct, 'name' | 'brand' | 'brandRef'>): string[] {
  const nameTokens = uniqueTokens(tokenizeProductName(product.name));
  const explicitBrandTokens = tokenizeProductName(product.brandRef?.name ?? product.brand);
  const inferredBrand = nameTokens.find((token) => KNOWN_BRANDS.includes(token));
  const brandTokens = uniqueTokens(explicitBrandTokens.length ? explicitBrandTokens : inferredBrand ? [inferredBrand] : []);

  if (brandTokens.length > 0) {
    const firstBrandIndex = nameTokens.findIndex((token) => brandTokens.includes(token));
    const familyTokens = nameTokens
      .slice(firstBrandIndex >= 0 ? firstBrandIndex + 1 : 0)
      .filter((token) => !brandTokens.includes(token))
      .slice(0, 2);
    return uniqueTokens([...brandTokens.slice(0, 1), ...familyTokens]).slice(0, 3);
  }

  return nameTokens.slice(0, 3);
}
