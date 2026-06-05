import Link from 'next/link';
import type { ReactNode } from 'react';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  bestOffer,
  collectOfferRows,
  comparableProducts,
  formatMoney,
  merchantName,
  numericValue,
  offerPrice,
  offerUrl,
  productImageUrl,
  type CommerceOfferRow,
} from '@/lib/commerce';
import {
  getCommerceProduct,
  listCommercePriceSnapshots,
  listCommerceProducts,
  listProductReviews,
  listSimilarCommerceProducts,
  mediaUrl,
  type CommerceOffer,
  type CommercePriceSnapshot,
  type CommerceProduct,
  type CommerceReview,
} from '@/lib/strapi';
import { wrapImpactAffiliate } from '@/lib/impact-links';
import { fmtDate } from '@/lib/format';
import { SITE } from '@/lib/site';
import PriceAlertForm from '@/components/PriceAlertForm';
import ReviewForm from '@/components/ReviewForm';
import CommerceProductCard from '@/components/CommerceProductCard';

export const revalidate = 60;
export const dynamicParams = true;

type Params = { slug: string };

// Outbound buy link: Impact deep-link if the merchant matches an approved Impact
// campaign (e.g. Whatnot), otherwise the offer's own affiliate/product URL.
function buyUrl(offer: CommerceOffer): string {
  return wrapImpactAffiliate(offer) ?? offerUrl(offer);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCommerceProduct(slug).catch(() => null);
  if (!product) return { title: 'Product not found' };

  const image = productImageUrl(product);
  const description =
    product.shortDescription ||
    `Compare current merchant prices for ${product.name} on ${SITE.name}.`;

  return {
    title: `${product.name} Prices`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} Prices`,
      description,
      url: `${SITE.url}/products/${product.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${product.name} Prices`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPricePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getCommerceProduct(slug).catch(() => null);
  if (!product) notFound();

  const similarProducts = await listSimilarCommerceProducts(product).catch(() => [] as CommerceProduct[]);
  const comparable = comparableProducts(product, similarProducts);
  let related = comparable.filter((p) => p.slug !== product.slug).slice(0, 10);
  // Sparse catalog: if no name-similar products, fall back to other products on
  // this storefront so the section still populates.
  if (related.length < 5) {
    const more = await listCommerceProducts({ pageSize: 12 }).then((r) => r.data).catch(() => [] as CommerceProduct[]);
    const seen = new Set([product.slug, ...related.map((p) => p.slug)]);
    related = [...related, ...more.filter((p) => !seen.has(p.slug))].slice(0, 10);
  }
  const rows = collectOfferRows(product, comparable);
  const priceSnapshots = await listCommercePriceSnapshots(
    [product, ...comparable].map((item) => item.documentId).filter(Boolean) as string[],
  ).catch(() => [] as CommercePriceSnapshot[]);
  const reviews = await listProductReviews(product.documentId ?? '').catch(() => [] as CommerceReview[]);
  const best = bestOffer(rows);
  const image = productImageUrl(product);
  const brand = product.brandRef?.name ?? product.brand;

  // Live multi-store offers (scripts/fetch-live-offers.mjs → data/live-offers.json).
  // Only show when the match is confident (2+ stores), so we never display a
  // mis-matched single offer. Links are already GeniusLink-wrapped at fetch time.
  let liveOffers: LiveOffer[] = [];
  let liveCapturedAt: string | null = null;
  try {
    const p = join(process.cwd(), 'data', 'live-offers.json');
    if (existsSync(p)) {
      const entry = (JSON.parse(readFileSync(p, 'utf8')).items ?? {})[slug];
      if (entry && Array.isArray(entry.offers) && entry.offers.length >= 2) {
        liveOffers = entry.offers as LiveOffer[];
        liveCapturedAt = entry.capturedAt ?? null;
      }
    }
  } catch {}
  const category = product.categories?.[0]?.name ?? product.category;
  const bestPrice = best ? offerPrice(best.offer) : null;
  const pricedRows = rows.filter((row) => offerPrice(row.offer) !== null);
  const initialVisibleOfferCount = 4;
  const hiddenOfferCount = Math.max(rows.length - initialVisibleOfferCount, 0);
  const offerToggleId = `offer-list-toggle-${product.id}`;
  const summary =
    product.shortDescription ||
    product.description ||
    (category
      ? `Compare current prices for this ${category.toLowerCase()} across trusted merchants.`
      : `Compare current prices for ${product.name} across trusted merchants.`);
  const discount = best ? discountPercent(best.offer) : null;
  const bestMerchant = best ? merchantName(best.offer) : null;
  const updatedLabel = product.updatedAt ? fmtDate(product.updatedAt) : 'Today';

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    category,
    image: image ? [image] : undefined,
    sku: product.sku ?? product.mpn ?? product.gtin ?? undefined,
    gtin: product.gtin ?? undefined,
    mpn: product.mpn ?? undefined,
    description: product.shortDescription ?? product.description ?? undefined,
    offers: rows.length
      ? {
          '@type': 'AggregateOffer',
          offerCount: rows.length,
          lowPrice: bestPrice ?? undefined,
          highPrice: pricedRows.length
            ? Math.max(...pricedRows.map((row) => offerPrice(row.offer) ?? 0))
            : undefined,
          priceCurrency: best?.offer.currency ?? 'USD',
          offers: rows.map((row) => offerJsonLd(row.offer)),
        }
      : undefined,
  };

  return (
    <main className="bg-white" data-testid={`product-price-${product.slug}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <section className="bg-white py-6 sm:py-8">
        <div className="mx-auto max-w-[1420px] px-4 sm:px-6">
          <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink/45" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-primary">Products</Link>
            {category && (
              <>
                <span>/</span>
                <span className="text-ink/60">{category}</span>
              </>
            )}
          </nav>

          <article className="mt-5 border border-ink/10 bg-white">
            <div className="grid lg:grid-cols-[34%_minmax(0,1fr)] lg:gap-[10px]">
              <div className="relative flex min-h-[340px] items-center justify-center border-b border-ink/10 p-7 lg:min-h-[410px] lg:border-b-0 lg:border-r">
                {discount !== null && (
                  <span className="absolute right-6 top-6 bg-[#ff2447] px-3 py-2 text-sm font-bold text-white">
                    -{discount}%
                  </span>
                )}
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={product.primaryImage?.alternativeText || product.name}
                    className="product-main-image max-h-[330px] w-full object-contain lg:max-h-[390px]"
                  />
                ) : (
                  <div className="flex h-[280px] w-full items-center justify-center bg-muted px-8 text-center font-display text-3xl font-bold text-ink/25">
                    {brand ?? 'NXT.Bargains'}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="border-b border-ink/10 p-6 sm:p-8">
                  <h1 className="product-title font-display font-bold leading-tight text-ink">
                    {product.name}
                  </h1>
                </div>

                <div className="grid lg:grid-cols-2">
                  <div className="border-b border-ink/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                    <p className="line-clamp-5 text-[14px] leading-7 text-ink/80">
                      {summary}
                    </p>

                    <div className="mt-8">
                      {best?.offer.originalPrice && numericValue(best.offer.originalPrice) !== numericValue(best.offer.price) && (
                        <span className="mr-2 text-lg text-ink/25 line-through">
                          {formatMoney(best.offer.originalPrice, best.offer.currency ?? 'USD')}
                        </span>
                      )}
                      <span className="font-display text-3xl font-bold text-ink">
                        {best ? formatMoney(best.offer.price ?? best.offer.originalPrice, best.offer.currency ?? 'USD') : 'Check price'}
                      </span>
                    </div>

                    <PriceAlertForm
                      productDocumentId={product.documentId}
                      currency={best?.offer.currency ?? 'USD'}
                      currentPrice={bestPrice ?? undefined}
                      buyHref={best ? buyUrl(best.offer) : undefined}
                    />

                    <p className="mt-5 text-sm text-ink/55">
                      Updated {updatedLabel}
                    </p>
                  </div>

                  <aside className="self-center p-5 sm:p-7">
                    <div className="mb-4 text-right text-xs font-medium text-[#149a43]">
                      Set Lowest Price Alert
                    </div>
                    {rows.length > 0 ? (
                      <div className="product-offer-list border border-ink/10">
                        <input id={offerToggleId} type="checkbox" className="product-offer-toggle sr-only" />
                        {rows.map((row, index) => (
                          <CompactOfferRow
                            key={row.offer.documentId ?? row.offer.id}
                            row={row}
                            className={index >= initialVisibleOfferCount ? 'product-offer-row-extra' : ''}
                          />
                        ))}
                        <div className="flex items-center justify-between border-t border-ink/10 px-3 py-3 text-xs">
                          {hiddenOfferCount > 0 ? (
                            <label htmlFor={offerToggleId} className="cursor-pointer font-medium text-red-600">
                              <span className="show-more-offers">Show all +</span>
                              <span className="show-less-offers">Show less</span>
                            </label>
                          ) : (
                            <span className="font-medium text-red-600">Show all +</span>
                          )}
                          <span className="text-ink/70">Price history</span>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-ink/10 bg-paper p-6">
                        <h2 className="font-display text-xl font-bold text-ink">No merchant prices yet</h2>
                        <p className="mt-3 text-sm leading-6 text-ink/60">
                          This product is in the catalog, but it does not have active merchant offers attached yet.
                        </p>
                      </div>
                    )}
                  </aside>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto max-w-[1420px] px-4 sm:px-6">
          <ProductInfoTabs
            productId={product.id}
            productName={product.name}
            summary={summary}
            description={product.description}
            specs={product.specs}
            best={best}
            bestMerchant={bestMerchant}
            rows={rows}
            snapshots={priceSnapshots}
            reviews={reviews}
            productDocumentId={product.documentId ?? ''}
            fallbackDate={product.updatedAt}
            updatedLabel={updatedLabel}
          />
        </div>
      </section>

      {liveOffers.length >= 2 && (
        <section className="border-t border-ink/10 py-12" data-testid="live-prices">
          <div className="mx-auto max-w-[1420px] px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-ink">Live prices across stores</h2>
              <p className="text-xs text-ink/45">
                <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                </span>
                Real-time offers{liveCapturedAt ? ` · updated ${timeAgo(liveCapturedAt)}` : ''}
              </p>
            </div>
            <LivePrices offers={liveOffers} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="border-t border-ink/10 bg-paper py-12" data-testid="related-products">
          <div className="mx-auto max-w-[1420px] px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold text-ink">Related products</h2>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {related.slice(0, 5).map((p) => (
                <CommerceProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function ProductInfoTabs({
  productId,
  productName,
  summary,
  description,
  specs,
  best,
  bestMerchant,
  rows,
  snapshots,
  reviews,
  productDocumentId,
  fallbackDate,
  updatedLabel,
}: {
  productId: number;
  productName: string;
  summary: string;
  description?: string | null;
  specs?: Record<string, unknown> | null;
  best: CommerceOfferRow | null;
  bestMerchant: string | null;
  rows: CommerceOfferRow[];
  snapshots: CommercePriceSnapshot[];
  reviews: CommerceReview[];
  productDocumentId: string;
  fallbackDate?: string;
  updatedLabel: string;
}) {
  const tabName = `product-info-tabs-${productId}`;
  const descriptionId = `description-tab-${productId}`;
  const specificationsId = `specifications-tab-${productId}`;
  const historyId = `price-history-tab-${productId}`;
  const reviewsId = `reviews-tab-${productId}`;
  const specEntries = productSpecificationEntries(specs);
  const featureSpecs = productFeatureSpecs(specs);
  const specSource = productSpecificationSource(specs);

  return (
    <div className="product-info-tabs border border-ink/10 bg-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .product-info-tabs .product-tab-panel { display: none; }
            .product-info-tabs:has(.tab-input-description:checked) .tab-panel-description { display: block; }
            .product-info-tabs:has(.tab-input-specifications:checked) .tab-panel-specifications { display: block; }
            .product-info-tabs:has(.tab-input-history:checked) .tab-panel-history { display: block; }
            .product-info-tabs:has(.tab-input-reviews:checked) .tab-panel-reviews { display: block; }
            .product-info-tabs:has(.tab-input-description:checked) .tab-label-description,
            .product-info-tabs:has(.tab-input-specifications:checked) .tab-label-specifications,
            .product-info-tabs:has(.tab-input-history:checked) .tab-label-history,
            .product-info-tabs:has(.tab-input-reviews:checked) .tab-label-reviews { color: #4778e6; }
          `,
        }}
      />
      <input
        id={descriptionId}
        name={tabName}
        type="radio"
        className="sr-only tab-input-description"
        defaultChecked
      />
      <input
        id={specificationsId}
        name={tabName}
        type="radio"
        className="sr-only tab-input-specifications"
      />
      <input
        id={historyId}
        name={tabName}
        type="radio"
        className="sr-only tab-input-history"
      />
      <input
        id={reviewsId}
        name={tabName}
        type="radio"
        className="sr-only tab-input-reviews"
      />

      <div className="flex overflow-x-auto border-b border-ink/10 text-sm font-bold uppercase tracking-[0.12em] text-ink/60" role="tablist" aria-label="Product information">
        <label htmlFor={descriptionId} className="tab-label-description cursor-pointer border-r border-ink/10 px-5 py-4 transition hover:text-primary">
          Description
        </label>
        <label htmlFor={specificationsId} className="tab-label-specifications cursor-pointer border-r border-ink/10 px-5 py-4 transition hover:text-primary">
          Specifications
        </label>
        <label htmlFor={historyId} className="tab-label-history cursor-pointer border-r border-ink/10 px-5 py-4 transition hover:text-primary">
          Price History
        </label>
        <label htmlFor={reviewsId} className="tab-label-reviews cursor-pointer px-5 py-4 transition hover:text-primary">
          Reviews
        </label>
      </div>

      <div className="product-tab-panel tab-panel-description">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Product details</h2>
            {description ? (
              <div className="mt-4 max-w-3xl text-[14px] leading-7 text-ink/70">
                <ProductDescription markdown={description} />
              </div>
            ) : (
              <p className="mt-4 max-w-3xl text-[14px] leading-7 text-ink/70">{summary}</p>
            )}
          </div>
          <dl className="grid gap-3 text-sm">
            <DetailRow label="Best price" value={best ? formatMoney(best.offer.price ?? best.offer.originalPrice, best.offer.currency ?? 'USD') : 'Check price'} />
            <DetailRow label="Lowest merchant" value={bestMerchant ?? 'Not available'} />
            <DetailRow label="Tracked offers" value={`${rows.length}`} />
            <DetailRow label="Last updated" value={updatedLabel} />
          </dl>
        </div>
      </div>

      <div className="product-tab-panel tab-panel-specifications">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-ink">Specifications</h2>
            {specSource && (
              <p className="text-xs leading-5 text-ink/50">
                Imported from {specSource}
              </p>
            )}
          </div>

          {specEntries.length || featureSpecs.length ? (
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
              <dl className="grid overflow-hidden border border-ink/10 text-sm">
                {specEntries.map((entry) => (
                  <div key={entry.label} className="grid gap-2 border-b border-ink/10 px-4 py-3 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)]">
                    <dt className="font-bold text-ink/55">{entry.label}</dt>
                    <dd className="text-ink">{entry.value}</dd>
                  </div>
                ))}
              </dl>

              {featureSpecs.length > 0 && (
                <div className="border border-ink/10 bg-paper p-5">
                  <h3 className="font-display text-lg font-bold text-ink">Features</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-ink/70">
                    {featureSpecs.map((feature) => (
                      <li key={feature} className="border-b border-ink/10 pb-3 last:border-b-0 last:pb-0">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 border border-ink/10 bg-paper p-6 text-sm leading-6 text-ink/60">
              Product specifications have not been imported for this item yet.
            </div>
          )}
        </div>
      </div>

      <div className="product-tab-panel tab-panel-history">
        <PriceHistorySection
          productName={productName}
          rows={rows}
          snapshots={snapshots}
          fallbackDate={fallbackDate}
          embedded
        />
      </div>

      <div className="product-tab-panel tab-panel-reviews">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">
              Reviews{reviews.length ? ` (${reviews.length})` : ''}
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-ink/60">No reviews yet — be the first to review {productName}.</p>
            ) : (
              <ul className="mt-5 divide-y divide-ink/10">
                {reviews.map((r) => (
                  <li key={r.id} className="py-5 first:pt-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-amber-400" aria-label={`${r.rating} out of 5`}>
                        {'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}
                        <span className="text-ink/20">{'★'.repeat(5 - Math.max(0, Math.min(5, Math.round(r.rating))))}</span>
                      </span>
                      <span className="font-display text-sm font-bold text-ink">{r.authorName}</span>
                      <span className="text-xs text-ink/40">{fmtDate(r.createdAt)}</span>
                    </div>
                    {r.title && <p className="mt-2 font-display text-sm font-bold text-ink">{r.title}</p>}
                    <p className="mt-1.5 text-sm leading-6 text-ink/70">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ReviewForm productDocumentId={productDocumentId} />
        </div>
      </div>
    </div>
  );
}

type PriceHistoryEntry = {
  price: number;
  currency: string;
  checkedAt: string;
  merchantName?: string;
};

type PriceHistoryPoint = PriceHistoryEntry & {
  dateKey: string;
  label: string;
};

function PriceHistorySection({
  productName,
  rows,
  snapshots,
  fallbackDate,
  embedded = false,
}: {
  productName: string;
  rows: CommerceOfferRow[];
  snapshots: CommercePriceSnapshot[];
  fallbackDate?: string;
  embedded?: boolean;
}) {
  const entries = collectPriceHistoryEntries(snapshots, rows, fallbackDate);
  const points = buildDailyLowestPricePoints(entries);
  const latestUpdates = [...points]
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
    .slice(0, 3);

  const highest = highestPricePoint(points);
  const lowest = lowestPricePoint(points);
  const since = points[0]?.checkedAt;

  const content = (
    <div className={embedded ? 'p-6 sm:p-8' : 'p-5'}>
      <div className="border border-ink/10 bg-white">
        <div className="bg-muted px-5 py-4 text-center font-display text-base font-bold text-ink">
          Price history for {productName}
        </div>

        {points.length > 0 ? (
          <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
            <aside className="bg-gradient-to-r from-paper to-white px-4 py-6 text-xs text-ink">
              <p className="font-bold">Latest updates:</p>
              <div className="mt-5 space-y-5">
                {latestUpdates.map((entry, index) => (
                  <p key={`${entry.checkedAt}:${entry.price}:${index}`}>
                    <span className="font-medium">{formatMoney(entry.price, entry.currency)}</span>
                    <span className="text-ink/70"> - {fmtDate(entry.checkedAt)}</span>
                  </p>
                ))}
              </div>
              {since && <p className="mt-8">Since: {fmtDate(since)}</p>}
            </aside>

            <div className="min-w-0 px-4 py-6 sm:px-6">
              <PriceHistoryChart points={points} />
              <div className="mt-6 space-y-3 text-base">
                {highest && (
                  <p>
                    <span className="font-medium text-red-600">Highest Price:</span>{' '}
                    <span className="text-ink">{formatMoney(highest.price, highest.currency)} - {fmtDate(highest.checkedAt)}</span>
                  </p>
                )}
                {lowest && (
                  <p>
                    <span className="font-medium text-green-600">Lowest Price:</span>{' '}
                    <span className="text-ink">{formatMoney(lowest.price, lowest.currency)} - {fmtDate(lowest.checkedAt)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm leading-6 text-ink/60">
            Price tracking will appear here after this product has at least one saved merchant price.
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="border border-ink/10 bg-white">
      <div className="flex min-h-11 items-center justify-between border-b border-ink/10 bg-white px-4">
        <div className="flex items-center gap-3">
          <span className="flex h-4 w-4 flex-col justify-center gap-1" aria-hidden="true">
            <span className="h-0.5 w-4 bg-primary" />
            <span className="h-0.5 w-4 bg-primary" />
            <span className="h-0.5 w-4 bg-primary" />
          </span>
          <h2 className="font-display text-lg font-bold text-ink">Price History</h2>
        </div>
        <span className="h-2 w-2 rotate-45 border-b-2 border-r-2 border-ink" aria-hidden="true" />
      </div>
      {content}
    </div>
  );
}

function PriceHistoryChart({ points }: { points: PriceHistoryPoint[] }) {
  const width = 980;
  const height = 260;
  const margin = { top: 28, right: 28, bottom: 48, left: 62 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const maxPrice = Math.max(...points.map((point) => point.price));
  const chartMax = niceChartMax(maxPrice);
  const yTicks = Array.from({ length: 5 }, (_, index) => chartMax - (chartMax / 4) * index);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? plotRight : plotLeft + (plotWidth * index) / (points.length - 1);
    const y = plotTop + (1 - point.price / chartMax) * plotHeight;
    return { ...point, x, y };
  });
  const first = coords[0];
  const last = coords[coords.length - 1];
  const linePath =
    coords.length === 1
      ? `M ${plotLeft} ${first.y} L ${plotRight} ${first.y}`
      : coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath =
    coords.length === 1
      ? `M ${plotLeft} ${plotBottom} L ${plotLeft} ${first.y} L ${plotRight} ${first.y} L ${plotRight} ${plotBottom} Z`
      : `M ${plotLeft} ${plotBottom} ${coords
          .map((point, index) => `${index === 0 ? 'L' : 'L'} ${point.x} ${point.y}`)
          .join(' ')} L ${last.x} ${plotBottom} Z`;
  const xTicks = chartTickPoints(points);
  const tooltipWidth = 112;
  const tooltipHeight = 62;
  const tooltipX = clamp(last.x > width - 150 ? last.x - tooltipWidth - 12 : last.x + 12, plotLeft, width - tooltipWidth - 4);
  const tooltipY = clamp(last.y + 12, plotTop + 4, plotBottom - tooltipHeight + 2);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Product price history chart"
        className="h-auto min-w-[720px] w-full"
      >
        {yTicks.map((tick) => {
          const y = plotTop + (1 - tick / chartMax) * plotHeight;
          return (
            <g key={tick}>
              <line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke="#e7edf4" strokeWidth="1" />
              <text x={plotLeft - 12} y={y + 4} textAnchor="end" fontSize="12" fill="#667085">
                {formatAxisPrice(tick, points[0]?.currency ?? 'USD')}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="#8fbedc" opacity="0.95" />
        <path d={linePath} fill="none" stroke="#0875bb" strokeWidth="3" strokeLinejoin="round" />
        {coords.map((point, index) => (
          <circle
            key={`${point.dateKey}:${index}`}
            cx={point.x}
            cy={point.y}
            r={index === coords.length - 1 ? 7 : 4}
            fill="#0875bb"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}

        {xTicks.map((tick) => {
          const index = points.findIndex((point) => point.dateKey === tick.dateKey);
          const x = points.length === 1 ? plotRight : plotLeft + (plotWidth * Math.max(index, 0)) / Math.max(points.length - 1, 1);
          const tickX = clamp(x, plotLeft + 34, plotRight - 34);
          return (
            <text key={tick.dateKey} x={tickX} y={plotBottom + 28} textAnchor="middle" fontSize="12" fill="#667085">
              {tick.dateKey}
            </text>
          );
        })}

        <rect
          x={tooltipX}
          y={tooltipY}
          width={tooltipWidth}
          height={tooltipHeight}
          rx="8"
          fill="#ffffff"
          stroke="#d9dee7"
          strokeWidth="1"
        />
        <text x={tooltipX + 12} y={tooltipY + 24} fontSize="12" fontWeight="700" fill="#475467">
          {last.dateKey}
        </text>
        <text x={tooltipX + 12} y={tooltipY + 48} fontSize="12" fill="#0066cc">
          Price: {formatPlainPrice(last.price, last.currency)}
        </text>
      </svg>
    </div>
  );
}

function CompactOfferRow({ row, className = '' }: { row: CommerceOfferRow; className?: string }) {
  const { offer, product } = row;
  const logo = mediaUrl(offer.merchant?.logo ?? null);
  const price = offer.price ?? offer.originalPrice;
  const unavailable = offer.availability === 'out_of_stock';

  return (
    <div className={`product-offer-row grid min-h-[48px] grid-cols-[minmax(0,1fr)_108px_82px] border-b border-ink/10 text-sm last:border-b-0 ${className}`}>
      <a
        href={buyUrl(offer)}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="flex min-w-0 items-center gap-2 px-3 py-2 text-ink transition hover:text-primary"
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={`${merchantName(offer)} logo`} className="h-4 w-4 shrink-0 object-contain" />
        ) : (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-muted text-[10px] font-bold text-ink/45">
            {merchantName(offer).slice(0, 1)}
          </span>
        )}
        <span className="truncate">{merchantName(offer)}</span>
      </a>
      <div className="bg-[#f7fbf2] px-3 py-2 text-center">
        <p className="font-bold text-ink">{formatMoney(price, offer.currency ?? 'USD')}</p>
        {unavailable && <p className="mt-0.5 text-[10px] font-bold text-red-600">out of stock</p>}
      </div>
      <a
        href={buyUrl(offer)}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        aria-label={`See offer for ${offer.title || product.name} at ${merchantName(offer)}`}
        className="flex items-center justify-center bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-emphasis"
      >
        See it
      </a>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-ink/10 pb-3 last:border-b-0">
      <dt className="text-ink/45">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

type SpecificationEntry = {
  label: string;
  value: string;
};

const HIDDEN_SPEC_KEYS = new Set([
  'technicalSpecs',
  'features',
  'Features',
  'source',
  'confidence',
  'sourceUrl',
  'importedAt',
  'imageUrl',
  'sourceImageUrl',
  'imageSource',
  'imageImportedAt',
  'imageBackgroundRemoved',
  'imageBackgroundProvider',
  'imageBackgroundStorage',
  'imageBackgroundRemovedAt',
  'imageBackgroundError',
  'specSourceMerchant',
  'specSourceMerchantSlug',
  'specSourceUrl',
  'specImportedAt',
]);

function productSpecificationEntries(specs?: Record<string, unknown> | null): SpecificationEntry[] {
  if (!isPlainRecord(specs)) return [];

  const technicalSpecs = isPlainRecord(specs.technicalSpecs) ? specs.technicalSpecs : {};
  const source = Object.keys(technicalSpecs).length ? technicalSpecs : specs;

  return Object.entries(source)
    .filter(([key]) => !HIDDEN_SPEC_KEYS.has(key) && !/^features?$/i.test(key))
    .map(([key, value]) => ({
      label: key,
      value: formatSpecValue(value),
    }))
    .filter((entry): entry is SpecificationEntry => Boolean(entry.value))
    .slice(0, 80);
}

function productFeatureSpecs(specs?: Record<string, unknown> | null): string[] {
  if (!isPlainRecord(specs)) return [];

  const technicalSpecs = isPlainRecord(specs.technicalSpecs) ? specs.technicalSpecs : {};
  const raw = technicalSpecs.Features ?? technicalSpecs.features ?? specs.Features ?? specs.features;
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return values
    .map((value) => formatSpecValue(value))
    .filter((value): value is string => Boolean(value))
    .slice(0, 30);
}

function productSpecificationSource(specs?: Record<string, unknown> | null): string | null {
  if (!isPlainRecord(specs)) return null;
  return typeof specs.specSourceMerchant === 'string' && specs.specSourceMerchant.trim()
    ? specs.specSourceMerchant.trim()
    : null;
}

function formatSpecValue(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const items = value.map((item) => formatSpecValue(item)).filter(Boolean);
    return items.length ? items.join(', ') : undefined;
  }
  if (isPlainRecord(value)) {
    const items = Object.entries(value)
      .map(([key, entryValue]) => {
        const formatted = formatSpecValue(entryValue);
        return formatted ? `${key}: ${formatted}` : undefined;
      })
      .filter(Boolean);
    return items.length ? items.join('; ') : undefined;
  }
  return undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function collectPriceHistoryEntries(
  snapshots: CommercePriceSnapshot[],
  rows: CommerceOfferRow[],
  fallbackDate?: string,
): PriceHistoryEntry[] {
  const snapshotEntries = snapshots
    .map((snapshot): PriceHistoryEntry | null => {
      const price = numericValue(snapshot.price);
      if (price === null || !snapshot.checkedAt) return null;
      return {
        price,
        currency: snapshot.currency || 'USD',
        checkedAt: snapshot.checkedAt,
        merchantName: snapshot.merchant?.name,
      };
    })
    .filter((entry): entry is PriceHistoryEntry => Boolean(entry));

  if (snapshotEntries.length > 0) return snapshotEntries;

  return rows
    .map((row): PriceHistoryEntry | null => {
      const price = offerPrice(row.offer);
      if (price === null) return null;
      return {
        price,
        currency: row.offer.currency || 'USD',
        checkedAt: row.offer.lastCheckedAt || fallbackDate || new Date().toISOString(),
        merchantName: merchantName(row.offer),
      };
    })
    .filter((entry): entry is PriceHistoryEntry => Boolean(entry));
}

function buildDailyLowestPricePoints(entries: PriceHistoryEntry[]): PriceHistoryPoint[] {
  const byDate = new Map<string, PriceHistoryPoint>();

  for (const entry of entries) {
    const dateKey = isoDateKey(entry.checkedAt);
    if (!dateKey) continue;
    const current = byDate.get(dateKey);
    if (!current || entry.price < current.price) {
      byDate.set(dateKey, {
        ...entry,
        dateKey,
        label: fmtDate(entry.checkedAt),
      });
    }
  }

  return Array.from(byDate.values()).sort(
    (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime(),
  );
}

function highestPricePoint(points: PriceHistoryPoint[]): PriceHistoryPoint | null {
  return points.reduce<PriceHistoryPoint | null>((highest, point) => {
    if (!highest || point.price > highest.price) return point;
    return highest;
  }, null);
}

function lowestPricePoint(points: PriceHistoryPoint[]): PriceHistoryPoint | null {
  return points.reduce<PriceHistoryPoint | null>((lowest, point) => {
    if (!lowest || point.price < lowest.price) return point;
    return lowest;
  }, null);
}

function chartTickPoints(points: PriceHistoryPoint[], maxTicks = 8): PriceHistoryPoint[] {
  if (points.length <= maxTicks) return points;
  const indexes = new Set<number>();
  for (let i = 0; i < maxTicks; i++) {
    indexes.add(Math.round((i * (points.length - 1)) / (maxTicks - 1)));
  }
  return Array.from(indexes)
    .sort((a, b) => a - b)
    .map((index) => points[index]);
}

function niceChartMax(maxPrice: number): number {
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) return 100;
  return niceStep((maxPrice * 1.1) / 4) * 4;
}

function niceStep(value: number): number {
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 1.5 ? 1.5 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
}

function isoDateKey(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatAxisPrice(value: number, currency: string): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} ${currency || 'USD'}`;
}

function formatPlainPrice(value: number, currency: string): string {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)} ${currency || 'USD'}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function discountPercent(offer: CommerceOffer): number | null {
  const price = numericValue(offer.price);
  const originalPrice = numericValue(offer.originalPrice);
  if (price === null || originalPrice === null || originalPrice <= price) return null;
  return Math.max(1, Math.round((1 - price / originalPrice) * 100));
}

function offerJsonLd(offer: CommerceOffer) {
  const price = offerPrice(offer);
  return {
    '@type': 'Offer',
    url: offerUrl(offer),
    price: price ?? undefined,
    priceCurrency: offer.currency ?? 'USD',
    availability: schemaAvailability(offer.availability),
    itemCondition: schemaCondition(offer.condition),
    seller: offer.merchant?.name ? { '@type': 'Organization', name: merchantName(offer) } : undefined,
  };
}

function schemaAvailability(value?: CommerceOffer['availability']): string {
  switch (value) {
    case 'in_stock':
      return 'https://schema.org/InStock';
    case 'out_of_stock':
      return 'https://schema.org/OutOfStock';
    case 'preorder':
      return 'https://schema.org/PreOrder';
    default:
      return 'https://schema.org/LimitedAvailability';
  }
}

function schemaCondition(value?: CommerceOffer['condition']): string {
  switch (value) {
    case 'used':
      return 'https://schema.org/UsedCondition';
    case 'refurbished':
      return 'https://schema.org/RefurbishedCondition';
    default:
      return 'https://schema.org/NewCondition';
  }
}

/* Tiny markdown renderer for the product description format we generate
   (### headings + "- " bullets + paragraphs separated by blank lines).
   No external dependency; the format is constrained so a hand-rolled parser
   is shorter than wiring up `marked` and safer than dangerouslySetInnerHTML. */
function ProductDescription({ markdown }: { markdown: string }) {
  function inline(text: string): ReactNode {
    const parts: ReactNode[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('**')) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
      else parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
      last = m.index + tok.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={key++} className="mt-6 pt-1 font-display text-base font-bold text-ink first:mt-0">
          {inline(line.slice(4).trim())}
        </h3>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={key++} className="mt-6 font-display text-lg font-bold text-ink first:mt-0">
          {inline(line.slice(3).trim())}
        </h3>,
      );
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="mt-3 list-disc space-y-1.5 pl-5">
          {items.map((it, idx) => <li key={idx}>{inline(it)}</li>)}
        </ul>,
      );
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length
      && lines[i].trim()
      && !lines[i].startsWith('### ')
      && !lines[i].startsWith('## ')
      && !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(<p key={key++} className="mt-3 first:mt-0">{inline(para.join(' '))}</p>);
  }
  return <div>{blocks}</div>;
}

type LiveOffer = {
  store: string;
  price: string | null;
  priceValue: number | null;
  originalPrice: string | null;
  onSale: boolean;
  condition: string | null;
  favicon: string | null;
  url: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* Live multi-store price comparison rows (cheapest first; row #0 is "Best
   price"). Links are GeniusLink-wrapped at fetch time for auto-affiliation. */
function LivePrices({ offers }: { offers: LiveOffer[] }) {
  return (
    <div className="mt-6 overflow-hidden border border-ink/10">
      {offers.map((o, i) => (
        <a
          key={`${o.store}-${i}`}
          href={o.url}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="flex items-center gap-4 border-b border-ink/10 px-4 py-3 transition last:border-b-0 hover:bg-paper"
        >
          {o.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.favicon} alt="" referrerPolicy="no-referrer" className="h-6 w-6 shrink-0 rounded object-contain" />
          ) : (
            <span className="h-6 w-6 shrink-0 rounded bg-muted" />
          )}
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 block font-display text-sm font-bold text-ink">{o.store}</span>
            {o.condition && o.condition.toLowerCase() !== 'new' ? (
              <span className="text-xs text-ink/45">{o.condition}</span>
            ) : null}
          </span>
          {i === 0 && (
            <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 sm:inline">Best price</span>
          )}
          <span className="text-right">
            <span className="block font-display text-base font-bold text-ink">{o.price ?? '—'}</span>
            {o.onSale && o.originalPrice ? (
              <span className="text-xs text-ink/40 line-through">{o.originalPrice}</span>
            ) : null}
          </span>
          <span className="ml-2 hidden shrink-0 border border-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary sm:inline">View</span>
        </a>
      ))}
    </div>
  );
}
