import type { Metadata } from 'next';
import DealProductCard from '@/components/DealProductCard';
import { bestOffer, collectOfferRows, numericValue, offerPrice, type CommerceOfferRow } from '@/lib/commerce';
import {
  listCommercePriceSnapshots,
  listCommerceProductsForDeals,
  type CommercePriceSnapshot,
  type CommerceProduct,
} from '@/lib/strapi';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Price Drops',
  description: 'See recently tracked product price drops and compare current merchant offers on NXT.Bargains.',
  alternates: { canonical: '/price-drops' },
};

type PriceDrop = {
  product: CommerceProduct;
  row: CommerceOfferRow;
  dropPercent: number;
  dropAmount: number;
  currentPrice: number;
  previousPrice: number;
  checkedAt: string;
};

export default async function PriceDropsPage() {
  const products = await listCommerceProductsForDeals(120).catch(() => [] as CommerceProduct[]);
  const productIds = products.map((product) => product.documentId).filter(Boolean) as string[];
  const snapshots = await listCommercePriceSnapshots(productIds, 1200).catch(() => [] as CommercePriceSnapshot[]);
  const productsByDocumentId = new Map(products.map((product) => [product.documentId, product]));
  const snapshotsByProduct = groupSnapshotsByProduct(snapshots);
  const drops = Array.from(snapshotsByProduct.entries())
    .map(([documentId, productSnapshots]) => {
      const product = productsByDocumentId.get(documentId);
      if (!product) return null;
      return buildPriceDrop(product, productSnapshots);
    })
    .filter((drop): drop is PriceDrop => Boolean(drop))
    .sort((a, b) => b.dropPercent - a.dropPercent || b.dropAmount - a.dropAmount)
    .slice(0, 36);

  return (
    <main data-testid="price-drops-page">
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Tracked price drops</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
            Products that recently moved lower.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
            These products are ranked from the saved price history snapshots collected for the site.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1366px] px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Recent movement</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">Biggest tracked drops</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink/55">
              Price drops compare the latest tracked price against the highest earlier tracked price for the same product.
            </p>
          </div>

          {drops.length > 0 ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {drops.map((drop) => (
                <DealProductCard
                  key={`${drop.product.id}-${drop.row.offer.id}-${drop.checkedAt}`}
                  product={drop.product}
                  row={drop.row}
                  metric={{ label: 'Dropped', value: `${drop.dropPercent}%`, tone: 'red' }}
                  note={`Was ${formatPlainMoney(drop.previousPrice, drop.row.offer.currency ?? 'USD')} · saved ${formatPlainMoney(drop.dropAmount, drop.row.offer.currency ?? 'USD')}`}
                  titleAs="h4"
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No price drops yet" body="This page will populate after products have at least two tracked price snapshots with a lower latest price." />
          )}
        </div>
      </section>
    </main>
  );
}

function groupSnapshotsByProduct(snapshots: CommercePriceSnapshot[]) {
  const map = new Map<string, CommercePriceSnapshot[]>();
  for (const snapshot of snapshots) {
    const documentId = snapshot.product?.documentId;
    if (!documentId) continue;
    if (!map.has(documentId)) map.set(documentId, []);
    map.get(documentId)!.push(snapshot);
  }
  return map;
}

function buildPriceDrop(product: CommerceProduct, snapshots: CommercePriceSnapshot[]): PriceDrop | null {
  const priced = snapshots
    .map((snapshot) => ({
      snapshot,
      price: numericValue(snapshot.price) ?? numericValue(snapshot.originalPrice),
    }))
    .filter((entry): entry is { snapshot: CommercePriceSnapshot; price: number } => entry.price !== null)
    .sort((a, b) => new Date(a.snapshot.checkedAt).getTime() - new Date(b.snapshot.checkedAt).getTime());
  if (priced.length < 2) return null;

  const latest = priced[priced.length - 1];
  const previousHighest = priced.slice(0, -1).reduce((max, entry) => (entry.price > max.price ? entry : max), priced[0]);
  if (latest.price >= previousHighest.price) return null;

  const row = bestOffer(collectOfferRows(product));
  if (!row) return null;

  const currentOfferPrice = offerPrice(row.offer);
  const currentPrice = currentOfferPrice ?? latest.price;
  const dropAmount = previousHighest.price - currentPrice;
  if (dropAmount <= 0) return null;

  return {
    product,
    row,
    currentPrice,
    previousPrice: previousHighest.price,
    dropAmount,
    dropPercent: Math.round((dropAmount / previousHighest.price) * 100),
    checkedAt: latest.snapshot.checkedAt,
  };
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
