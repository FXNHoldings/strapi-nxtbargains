import type { Metadata } from 'next';
import DealProductCard from '@/components/DealProductCard';
import { bestOffer, collectOfferRows, numericValue, offerPrice, type CommerceOfferRow } from '@/lib/commerce';
import { listCommerceProductsForDeals, type CommerceProduct } from '@/lib/strapi';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Best Deals',
  description: 'Shop the strongest current product discounts and merchant offers tracked by NXT.Bargains.',
  alternates: { canonical: '/best-deals' },
};

type BestDeal = {
  product: CommerceProduct;
  row: CommerceOfferRow;
  discount: number;
  savings: number;
};

export default async function BestDealsPage() {
  const products = await listCommerceProductsForDeals(160).catch(() => [] as CommerceProduct[]);
  const deals = products
    .map((product) => {
      const row = bestOffer(collectOfferRows(product));
      if (!row) return null;
      const stats = dealStats(row);
      if (stats.discount <= 0 && stats.savings <= 0) return null;
      return { product, row, ...stats };
    })
    .filter((deal): deal is BestDeal => Boolean(deal))
    .sort((a, b) => b.discount - a.discount || b.savings - a.savings)
    .slice(0, 36);

  return (
    <main data-testid="best-deals-page">
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">NXT.Bargains Deals</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
            Best deals across tracked merchants.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
            Products ranked by current savings, using saved merchant offers from the commerce catalog.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1366px] px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Current offers</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">Highest discounts right now</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink/55">
              Final prices can change at checkout. Check shipping, condition, and availability on the merchant site.
            </p>
          </div>

          {deals.length > 0 ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {deals.map((deal) => (
                <DealProductCard
                  key={`${deal.product.id}-${deal.row.offer.id}`}
                  product={deal.product}
                  row={deal.row}
                  metric={{ label: 'Save', value: `${deal.discount}%`, tone: 'green' }}
                  note={deal.savings > 0 ? `Estimated savings ${formatPlainMoney(deal.savings, deal.row.offer.currency ?? 'USD')}` : undefined}
                  titleAs="h4"
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No discounted offers yet" body="Add merchant offers with original prices or discount percentages to populate this page." />
          )}
        </div>
      </section>
    </main>
  );
}

function dealStats(row: CommerceOfferRow) {
  const explicitDiscount = numericValue(row.offer.discountPercent);
  const price = offerPrice(row.offer);
  const original = numericValue(row.offer.originalPrice);
  const calculatedDiscount = price !== null && original !== null && original > price
    ? Math.round(((original - price) / original) * 100)
    : 0;
  const discount = Math.max(0, Math.round(explicitDiscount ?? calculatedDiscount));
  const savings = price !== null && original !== null && original > price ? original - price : 0;
  return { discount, savings };
}

function formatPlainMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 border border-ink/10 bg-paper p-8">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">{body}</p>
    </div>
  );
}
