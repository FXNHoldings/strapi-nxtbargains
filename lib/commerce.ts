import { mediaUrl, type CommerceOffer, type CommerceProduct } from '@/lib/strapi';

export type CommerceOfferRow = {
  offer: CommerceOffer;
  product: CommerceProduct;
};

export function numericValue(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function offerPrice(offer: CommerceOffer): number | null {
  return numericValue(offer.price) ?? numericValue(offer.originalPrice);
}

export function formatMoney(value?: number | string | null, currency = 'USD'): string {
  const price = numericValue(value);
  if (price === null) return 'Check price';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}

export function merchantName(offer: CommerceOffer): string {
  return (offer.merchant?.name ?? 'Merchant').replace(/\s+Affiliate Program$/i, '');
}

export function offerUrl(offer: CommerceOffer): string {
  return offer.affiliateUrl || offer.productUrl;
}

export function availabilityLabel(value?: CommerceOffer['availability']): string {
  switch (value) {
    case 'in_stock':
      return 'In stock';
    case 'out_of_stock':
      return 'Out of stock';
    case 'preorder':
      return 'Preorder';
    default:
      return 'Check availability';
  }
}

export function conditionLabel(value?: CommerceOffer['condition']): string {
  switch (value) {
    case 'open_box':
      return 'Open box';
    case 'refurbished':
      return 'Refurbished';
    case 'used':
      return 'Used';
    case 'new':
      return 'New';
    default:
      return 'Condition varies';
  }
}

export function productImageUrl(product: CommerceProduct): string | null {
  return mediaUrl(product.primaryImage ?? null) ?? mediaUrl(product.gallery?.[0] ?? null) ?? productSourceImageUrl(product);
}

function productSourceImageUrl(product: CommerceProduct): string | null {
  const specs = product.specs ?? {};
  const value = specs.imageUrl || specs.sourceImageUrl;
  if (typeof value !== 'string') return null;
  if (!/^https?:\/\//i.test(value)) return null;
  return value;
}

export function comparableProducts(baseProduct: CommerceProduct, products: CommerceProduct[]): CommerceProduct[] {
  if (isAccessoryProduct(baseProduct)) return products;
  return products.filter((product) => !isAccessoryProduct(product));
}

export function collectOfferRows(product: CommerceProduct, similarProducts: CommerceProduct[] = []): CommerceOfferRow[] {
  const rows: CommerceOfferRow[] = [];
  const seen = new Set<string>();

  for (const candidate of [product, ...similarProducts]) {
    for (const offer of candidate.offers ?? []) {
      if (offer.status && offer.status !== 'active') continue;
      const key = offer.documentId ?? `${offer.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ offer, product: candidate });
    }
  }

  return rows.sort((a, b) => {
    const aPrice = offerPrice(a.offer);
    const bPrice = offerPrice(b.offer);
    if (aPrice !== null && bPrice !== null && aPrice !== bPrice) return aPrice - bPrice;
    if (aPrice !== null) return -1;
    if (bPrice !== null) return 1;
    return merchantName(a.offer).localeCompare(merchantName(b.offer));
  });
}

export function bestOffer(rows: CommerceOfferRow[]): CommerceOfferRow | null {
  return rows.find((row) => offerPrice(row.offer) !== null) ?? rows[0] ?? null;
}

export function merchantCount(rows: CommerceOfferRow[]): number {
  return new Set(rows.map((row) => row.offer.merchant?.slug ?? merchantName(row.offer))).size;
}

const ACCESSORY_TERMS = [
  'case',
  'cases',
  'cover',
  'covers',
  'screen protector',
  'protector',
  'tempered glass',
  'charger',
  'charging',
  'cable',
  'cord',
  'mount',
  'holder',
  'stand',
  'wallet',
  'skin',
  'lens protector',
  'camera protector',
];

function isAccessoryProduct(product: CommerceProduct): boolean {
  const text = [
    product.name,
    product.shortDescription,
    product.category,
    product.categories?.map((category) => category.name).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return ACCESSORY_TERMS.some((term) => text.includes(term));
}
