import {
  availabilityLabel,
  conditionLabel,
  formatMoney,
  numericValue,
} from '@/lib/commerce';
import type { NxtPost, PostPriceComparisonOffer } from '@/lib/strapi';

function offerHref(offer: PostPriceComparisonOffer): string | null {
  return offer.affiliateUrl || offer.productUrl || null;
}

function checkedDate(value?: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PostPriceComparison({ post }: { post: NxtPost }) {
  const snapshot = post.priceComparisonResults;
  const offers = (snapshot?.results ?? []).filter((offer) => offerHref(offer));

  if (!post.priceComparisonEnabled || offers.length === 0) return null;

  const checked = checkedDate(snapshot?.generatedAt || post.priceComparisonLastRunAt);
  const pricedOffers = offers.filter((offer) => numericValue(offer.price) !== null);
  const bestPrice = pricedOffers[0]?.price;

  return (
    <section className="mt-14 border-y border-ink/10 py-10" data-testid="post-price-comparison">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Compare Prices</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
            Cheapest Merchant Offers
          </h2>
          {snapshot?.keyword && (
            <p className="mt-3 text-sm leading-6 text-ink/55">
              Search: <span className="font-medium text-ink">{snapshot.keyword}</span>
            </p>
          )}
        </div>
        {bestPrice !== undefined && (
          <div className="text-sm text-ink/55">
            Lowest found:{' '}
            <span className="font-display text-2xl font-bold text-ink">
              {formatMoney(bestPrice, pricedOffers[0]?.currency || 'USD')}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 overflow-hidden border border-ink/10">
        <div className="hidden grid-cols-[minmax(0,1.7fr)_0.75fr_0.9fr_0.8fr] border-b border-ink/10 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-ink/45 md:grid">
          <span>Offer</span>
          <span>Merchant</span>
          <span>Price</span>
          <span className="text-right">Link</span>
        </div>

        {offers.map((offer) => {
          const href = offerHref(offer);
          if (!href) return null;

          return (
            <div
              key={`${offer.merchantSlug}:${offer.productUrl || offer.affiliateUrl}`}
              className="grid gap-4 border-b border-ink/10 p-4 last:border-b-0 md:grid-cols-[minmax(0,1.7fr)_0.75fr_0.9fr_0.8fr] md:items-center"
            >
              <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-4">
                <span className="flex h-16 w-16 items-center justify-center bg-muted">
                  {offer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={offer.imageUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-ink/30">{offer.merchantName.slice(0, 2)}</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 font-display text-base font-bold leading-snug text-ink">
                    {offer.productName}
                  </span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-ink/45">
                    {[conditionLabel(offer.condition), availabilityLabel(offer.availability)].join(' / ')}
                  </span>
                </span>
              </div>

              <div className="text-sm font-semibold text-ink md:font-medium">{offer.merchantName}</div>

              <div>
                <div className="font-display text-xl font-bold text-ink">
                  {formatMoney(offer.price, offer.currency || 'USD')}
                </div>
                {numericValue(offer.originalPrice) !== null && numericValue(offer.originalPrice) !== numericValue(offer.price) && (
                  <div className="text-sm text-ink/45 line-through">
                    {formatMoney(offer.originalPrice, offer.currency || 'USD')}
                  </div>
                )}
              </div>

              <div className="md:text-right">
                <a
                  href={href}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="inline-flex rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis"
                >
                  View Deal
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {checked && (
        <p className="mt-4 text-xs leading-5 text-ink/45">
          Prices checked {checked}. Merchant prices, availability, and shipping can change.
        </p>
      )}
    </section>
  );
}
