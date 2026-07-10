import Link from 'next/link';
import type { Metadata } from 'next';
import DealProductCard from '@/components/DealProductCard';
import { SITE } from '@/lib/site';
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

  const dropCount = drops.length;
  const topDrop = drops[0]?.dropPercent ?? 0;
  const avgDrop = dropCount > 0
    ? Math.round(drops.reduce((sum, d) => sum + d.dropPercent, 0) / dropCount)
    : 0;
  const totalSavings = drops.reduce((sum, d) => sum + d.dropAmount, 0);
  const latestCheckedAt = drops.reduce((latest, d) => {
    const time = new Date(d.checkedAt).getTime();
    return time > latest ? time : latest;
  }, 0);
  const updatedLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(latestCheckedAt ? new Date(latestCheckedAt) : new Date());

  const featuredDrops = drops.slice(0, 4);

  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Price Drops',
    url: `${SITE.url}/price-drops`,
    description: metadata.description,
    numberOfItems: dropCount,
  };

  return (
    <main data-testid="price-drops-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />

      <Hero
        dropCount={dropCount}
        topDrop={topDrop}
        avgDrop={avgDrop}
        productsTracked={products.length}
        snapshotsCount={snapshots.length}
        updatedLabel={updatedLabel}
        totalSavings={totalSavings > 0 ? formatPlainMoney(totalSavings, 'USD') : null}
      />

      {dropCount > 0 ? (
        <section className="border-b border-ink/10 bg-[#f7fafc] py-10 sm:py-12" data-testid="featured-drops">
          <div className="mx-auto max-w-[1366px] px-6">
            <SectionHead
              eyebrow="Top picks"
              title="Biggest tracked drops"
              subtitle="Products with the largest price movement from their recent peak."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {featuredDrops.map((drop) => (
                <PriceDropCard key={`featured-${drop.product.id}-${drop.row.offer.id}-${drop.checkedAt}`} drop={drop} featured />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white py-10 sm:py-14" id="all-drops">
        <div className="mx-auto max-w-[1366px] px-6">
          <SectionHead
            eyebrow="All drops"
            title="Every price drop on this page"
            subtitle={
              dropCount > 0
                ? `${dropCount} products ranked by drop percentage. Each compares the latest tracked price against the highest earlier snapshot.`
                : 'No tracked price drops are available right now.'
            }
          />

          {dropCount > 0 ? (
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {drops.map((drop) => (
                <PriceDropCard key={`${drop.product.id}-${drop.row.offer.id}-${drop.checkedAt}`} drop={drop} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No price drops yet"
              body="This page will populate after products have at least two tracked price snapshots with a lower latest price."
            />
          )}
        </div>
      </section>

      <section className="border-t border-ink/10 bg-[#f7fafc] py-10">
        <div className="mx-auto max-w-[1366px] px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <BrowseCard href="/best-deals" title="Best deals" subtitle="Highest current merchant discounts" />
            <BrowseCard href="/products" title="All products" subtitle="Compare offers across merchants" />
            <BrowseCard href="/coupons" title="Coupons" subtitle="Promo codes and store deals" />
            <BrowseCard href="/deals" title="Buying guides" subtitle="Editorial deals and roundups" />
          </div>
        </div>
      </section>

      <ValueStrip dropCount={dropCount} />
    </main>
  );
}

function Hero({
  dropCount,
  topDrop,
  avgDrop,
  productsTracked,
  snapshotsCount,
  updatedLabel,
  totalSavings,
}: {
  dropCount: number;
  topDrop: number;
  avgDrop: number;
  productsTracked: number;
  snapshotsCount: number;
  updatedLabel: string;
  totalSavings: string | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-ink/10 bg-[#0c1222] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(at 80% 20%, rgba(21,86,238,0.22) 0%, transparent 50%), radial-gradient(at 15% 85%, rgba(239,68,68,0.1) 0%, transparent 50%)',
        }}
      />
      <div className="relative mx-auto max-w-[1366px] px-6 py-10 sm:py-14">
        <div className="flex flex-col gap-[3.5rem]">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <span aria-hidden>/</span>
            <span className="text-[#67b7ff]">Price drops</span>
          </nav>

          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#67b7ff]">Tracked price history</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Products that recently moved lower
            </h1>
            <p className="mt-4 text-base leading-7 text-white/70 sm:text-lg">
              Ranked from saved price history snapshots — each drop compares the latest
              tracked price against the highest earlier price for the same product.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 sm:gap-10">
            <Stat label="Price drops" value={String(dropCount)} />
            <Stat label="Biggest drop" value={dropCount > 0 ? `${topDrop}%` : '—'} />
            <Stat label="Avg. drop" value={dropCount > 0 ? `${avgDrop}%` : '—'} />
            <Stat label="Products tracked" value={String(productsTracked)} />
            <Stat label="Snapshots" value={String(snapshotsCount)} compact />
            <Stat label="Last updated" value={updatedLabel} compact />
            {totalSavings ? <Stat label="Total savings" value={totalSavings} compact /> : null}
          </div>
        </div>

        <div className="mt-[3.5rem] flex flex-wrap gap-3">
          <a href="#all-drops" className="inline-flex bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-emphasis">
            View all drops
          </a>
          <Link href="/best-deals" className="inline-flex border border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white/80 transition hover:border-white/40 hover:text-white">
            Best deals
          </Link>
          <Link href="/products" className="inline-flex border border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white/75 transition hover:border-white/40 hover:text-white">
            All products
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? 'max-w-[180px]' : undefined}>
      <p className={`font-display font-bold text-white ${compact ? 'text-base leading-snug' : 'text-3xl'}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-white/55">{label}</p>
    </div>
  );
}

function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display font-bold text-ink">{title}</h2>
      {subtitle ? <p className="mt-3 text-sm leading-7 text-ink/60 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}

function BrowseCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col border border-ink/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_28px_-20px_rgba(13,27,42,0.35)]"
    >
      <h4 className="font-display text-base font-bold text-ink group-hover:text-primary">{title}</h4>
      <p className="mt-1 text-sm text-ink/55">{subtitle}</p>
      <span className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-primary">Browse →</span>
    </Link>
  );
}

function PriceDropCard({ drop, featured = false }: { drop: PriceDrop; featured?: boolean }) {
  const currency = drop.row.offer.currency ?? 'USD';
  const note = `Was ${formatPlainMoney(drop.previousPrice, currency)} · saved ${formatPlainMoney(drop.dropAmount, currency)}`;

  return (
    <div className={featured ? 'relative' : undefined}>
      {featured ? (
        <span className="absolute right-3 top-3 z-10 rounded bg-primary/10 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-primary">
          Top pick
        </span>
      ) : null}
      <div
        className={
          featured
            ? 'transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(13,27,42,0.35)] [&>article]:border-primary/25 [&>article]:shadow-[0_12px_24px_-18px_rgba(21,86,238,0.2)]'
            : 'transition hover:-translate-y-0.5 [&>article]:hover:border-primary/30 [&>article]:hover:shadow-[0_14px_28px_-20px_rgba(13,27,42,0.35)]'
        }
      >
        <DealProductCard
          product={drop.product}
          row={drop.row}
          metric={{ label: 'Dropped', value: `${drop.dropPercent}%`, tone: 'red' }}
          note={note}
          titleAs="h4"
        />
      </div>
    </div>
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
    <div className="mt-8 border border-dashed border-ink/15 bg-[#f7fafc] p-10 text-center">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/60">{body}</p>
    </div>
  );
}

function ValueStrip({ dropCount }: { dropCount: number }) {
  const items = [
    {
      ic: '📉',
      t: 'Tracked price history',
      s: dropCount > 0
        ? 'Drops are calculated from saved snapshots comparing latest vs. peak tracked prices.'
        : 'Snapshots are collected as products are checked — drops appear once prices fall.',
    },
    { ic: '✓', t: 'Compare before you buy', s: 'Each card links to the full product page with live merchant offers.' },
    { ic: '→', t: 'More ways to save', s: 'Browse best deals, coupons, and buying guides on NXT.Bargains.' },
  ];
  return (
    <div className="border-t border-ink/10 bg-muted">
      <div className="mx-auto grid max-w-[1366px] gap-6 px-6 py-10 sm:grid-cols-3">
        {items.map((v) => (
          <div key={v.t} className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg">{v.ic}</span>
            <div>
              <div className="font-display text-[0.96rem] font-semibold text-ink">{v.t}</div>
              <div className="mt-0.5 text-[0.85rem] leading-6 text-ink/55">{v.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
