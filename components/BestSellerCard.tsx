export type Marketplace = 'amazon' | 'ebay' | 'walmart' | 'target' | 'bestbuy' | 'newegg';

export const MARKETPLACE_LABEL: Record<Marketplace, string> = {
  amazon: 'Amazon',
  ebay: 'eBay',
  walmart: 'Walmart',
  target: 'Target',
  bestbuy: 'Best Buy',
  newegg: 'Newegg',
};

export type BestSeller = {
  rank: number;
  asin?: string;
  id?: string;
  marketplace?: Marketplace;
  category?: string | null;
  categoryLabel?: string | null;
  title: string;
  price: string | null;
  priceValue: number | null;
  image: string;
  rating: number | null;
  ratingCount: number | null;
  url: string;
  badge?: string | null;
  badges?: string[];
  boughtInfo?: string | null;
  couponInfo?: string | null;
  dealBadge?: string | null;
  isPrime?: boolean;
  sponsored?: boolean;
  source?: string;
};

export default function BestSellerCard({ item }: { item: BestSeller }) {
  const marketplace: Marketplace = item.marketplace ?? 'amazon';
  const label = MARKETPLACE_LABEL[marketplace];
  const badges = bestSellerBadges(item);
  return (
    <article className="group relative flex h-full flex-col border border-ink/10 bg-white" data-testid={`bestseller-${marketplace}-${item.asin || item.id || item.rank}`}>
      <span className="absolute left-3 top-3 z-10 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">#{item.rank}</span>
      <a href={item.url} target="_blank" rel="nofollow sponsored noopener noreferrer" className="block overflow-hidden bg-white">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full object-contain p-5 transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <span className="flex h-44 w-full items-center justify-center bg-muted font-display text-xl font-bold text-ink/25">{label}</span>
        )}
      </a>
      <div className="flex flex-1 flex-col p-4">
        <a href={item.url} target="_blank" rel="nofollow sponsored noopener noreferrer">
          <h3 className="product-card-title line-clamp-2 font-display leading-snug text-ink transition group-hover:text-primary">{item.title}</h3>
        </a>
        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.slice(0, 3).map((badge) => (
              <span key={badge} className="rounded bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="font-display text-lg font-bold text-ink">{item.price ?? 'Check price'}</p>
          {item.rating ? <span className="whitespace-nowrap text-[11px] text-ink/45">★ {item.rating}</span> : null}
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-3 inline-flex justify-center rounded border border-primary bg-transparent px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-white"
        >
          View on {label}
        </a>
      </div>
    </article>
  );
}

export function bestSellerBadges(item: BestSeller) {
  const values = [
    item.badge,
    ...(item.badges ?? []),
    item.dealBadge,
    item.couponInfo ? 'Coupon' : null,
    item.boughtInfo,
    item.isPrime ? 'Prime' : null,
  ];
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}
