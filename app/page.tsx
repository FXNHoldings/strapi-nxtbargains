import Link from 'next/link';
import { SITE } from '@/lib/site';
import {
  listCommerceProducts,
  listPosts,
  listStores,
  type CommerceProduct,
  type NxtPost,
  type Store,
} from '@/lib/strapi';
import {
  bestOffer,
  collectOfferRows,
  formatMoney,
  merchantName,
  numericValue,
  offerPrice,
  productImageUrl,
} from '@/lib/commerce';
import PostCard from '@/components/PostCard';
import Hero from '@/components/Hero';
import { type BestSeller, type Marketplace } from '@/components/BestSellerCard';
import MarketplaceBestSellers from '@/components/MarketplaceBestSellers';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const revalidate = 60;

const STRIP_MARKETPLACES = ['Amazon', 'eBay', 'Walmart', 'Newegg', 'Best Buy', 'Target', 'US Mobile', 'Back Market'];

type Deal = {
  product: CommerceProduct;
  name: string;
  image: string | null;
  href: string;
  merchant: string;
  price: number | null;
  original: number | null;
  pct: number;
  currency: string;
};

function toDeal(product: CommerceProduct): Deal | null {
  const offers = (product.offers ?? []).filter((o) => !o.status || o.status === 'active');
  if (offers.length === 0) return null;

  // Choose the offer with the biggest discount (price vs original) to headline.
  let chosen = offers[0];
  let chosenPct = 0;
  let chosenPrice = numericValue(offers[0].price);
  let chosenOriginal = numericValue(offers[0].originalPrice);
  for (const o of offers) {
    const price = numericValue(o.price);
    const original = numericValue(o.originalPrice);
    const pct = price !== null && original !== null && original > price
      ? Math.round((1 - price / original) * 100)
      : 0;
    const cheaper = price !== null && (chosenPrice === null || price < chosenPrice);
    if (pct > chosenPct || (pct === chosenPct && cheaper)) {
      chosen = o; chosenPct = pct; chosenPrice = price; chosenOriginal = original;
    }
  }

  return {
    product,
    name: product.name,
    image: productImageUrl(product),
    href: `/products/${product.slug}`,
    merchant: merchantName(chosen),
    price: chosenPrice,
    original: chosenOriginal,
    pct: chosenPct,
    currency: chosen.currency ?? 'USD',
  };
}

export default async function HomePage() {
  // Pull live data; never let a Strapi hiccup break the page.
  const [productsRes, posts, stores] = await Promise.all([
    listCommerceProducts({ pageSize: 48 }).catch(() => null),
    listPosts({ pageSize: 6 }).then((r) => r.data).catch(() => [] as NxtPost[]),
    listStores().catch(() => [] as Store[]),
  ]);

  const products = productsRes?.data ?? [];

  // Match each marketplace-strip name to a store logo (fall back to text).
  const normStore = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const stripItems = STRIP_MARKETPLACES.map((name) => {
    const n = normStore(name);
    const match =
      stores.find((s) => normStore(s.name) === n) ||
      stores.find((s) => { const sn = normStore(s.name); return sn.includes(n) || n.includes(sn); });
    return { name, logo: match?.logo ?? null };
  });
  const deals = products.map(toDeal).filter((d): d is Deal => d !== null);
  const priceDrops = deals.filter((d) => d.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 5);
  const trending = products.slice(0, 5);

  // Best Sellers — one daily JSON cache per marketplace (scripts/fetch-*.mjs).
  const MARKETPLACE_FILES: { key: Marketplace; file: string }[] = [
    { key: 'amazon', file: 'best-sellers.json' },
    { key: 'ebay', file: 'best-sellers-ebay.json' },
    { key: 'walmart', file: 'best-sellers-walmart.json' },
    { key: 'target', file: 'best-sellers-target.json' },
    { key: 'bestbuy', file: 'best-sellers-bestbuy.json' },
  ];
  const bestSellerGroups = MARKETPLACE_FILES.map(({ key, file }) => {
    try {
      const p = join(process.cwd(), 'data', file);
      if (!existsSync(p)) return { key, items: [] as BestSeller[] };
      const items = ((JSON.parse(readFileSync(p, 'utf8')).items ?? []) as BestSeller[]).map((it) => ({
        ...it,
        marketplace: key,
      }));
      return { key, items };
    } catch {
      return { key, items: [] as BestSeller[] };
    }
  }).filter((g) => g.items.length > 0);

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div data-testid="home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <Hero />

      {/* ---------- MARKETPLACE STRIP ---------- */}
      <div className="border-y border-ink/10 bg-muted" data-testid="home-strip">
        <div className="mx-auto flex max-w-[1366px] flex-wrap items-center justify-center gap-x-9 gap-y-3.5 px-6 py-5">
          <span className="text-[0.78rem] font-semibold text-ink/55">Comparing prices across</span>
          {stripItems.map((m) => (m.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.name} src={m.logo} alt={m.name} title={m.name} referrerPolicy="no-referrer" className="h-7 w-auto max-w-[96px] object-contain opacity-70 mix-blend-multiply transition hover:opacity-100" />
          ) : (
            <span key={m.name} className="font-display text-[1.02rem] font-bold text-ink/40 transition hover:text-primary">{m.name}</span>
          )))}
        </div>
      </div>

      {/* ---------- TODAY'S BIGGEST PRICE DROPS ---------- */}
      {priceDrops.length >= 3 && (
        <section className="py-14 sm:py-[72px]" data-testid="home-price-drops">
          <div className="mx-auto max-w-[1366px] px-6">
            <SectionHead eyebrow="● Live now" title="Today's biggest price drops" intro="The steepest discounts we're tracking across marketplaces right now." cta={{ href: '/products', label: 'All products' }} />
            <div className="mt-9 grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-5">
              {priceDrops.map((d) => <DealCard key={d.product.id} deal={d} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---------- BEST SELLERS ---------- */}
      {bestSellerGroups.length > 0 && (
        <section className="pb-14 sm:pb-[72px]" data-testid="home-best-sellers">
          <div className="mx-auto max-w-[1366px] px-6">
            <SectionHead eyebrow="Top picks" title="Best Sellers" intro="The top-ranked products across the major marketplaces, refreshed daily." />
            <div className="mt-9"><MarketplaceBestSellers groups={bestSellerGroups} /></div>
          </div>
        </section>
      )}

      {/* ---------- TRENDING ---------- */}
      {trending.length > 0 && (
        <section className="pb-14 sm:pb-[72px]" data-testid="home-trending">
          <div className="mx-auto max-w-[1366px] px-6">
            <SectionHead eyebrow="Most compared" title="Trending products" intro="Popular picks shoppers are comparing across Amazon, eBay and more." cta={{ href: '/products', label: 'Browse all' }} />
            <div className="mt-9 grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-5">
              {trending.map((p) => <TrendingCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---------- BUYING GUIDES & REVIEWS ---------- */}
      {posts.length > 0 && (
        <section className="pb-14 sm:pb-[72px]" data-testid="home-guides">
          <div className="mx-auto max-w-[1366px] px-6">
            <SectionHead eyebrow="Read first" title="Buying guides & reviews" intro="Honest comparisons and reviews to help you buy with confidence." cta={{ href: '/deals', label: 'All guides' }} />
            <div className="mt-9 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <PostCard post={posts[0]} variant="feature" thumbBg="bg-white" />
              <div className="flex flex-col gap-3">
                {posts.slice(1, 5).map((post) => (
                  <PostCard key={post.id} post={post} variant="compact" thumbBg="bg-white" />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <HowItWorks />
      <FinalCta />
    </div>
  );
}

/* ----------------------------------------------------------- Section header */
function SectionHead({
  eyebrow,
  title,
  intro,
  cta,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-[52ch]">
        <p className="text-[0.74rem] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 font-display !text-[clamp(1.7rem,3.2vw,2rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink">{title}</h2>
        {intro && <p className="mt-2 text-[0.98rem] leading-relaxed text-ink/55">{intro}</p>}
      </div>
      {cta && (
        <Link href={cta.href} className="inline-flex shrink-0 items-center gap-[7px] rounded-[10px] border border-ink/10 bg-white px-4 py-2.5 font-display text-[0.9rem] font-semibold text-ink transition hover:-translate-y-px hover:border-primary hover:text-primary">
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Deal card */
function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link href={deal.href} className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white transition hover:-translate-y-1.5 hover:shadow-[0_26px_46px_-26px_rgba(13,27,42,0.42)]" data-testid={`pricedrop-${deal.product.slug}`}>
      <div className="relative grid aspect-square place-items-center bg-white p-5">
        {deal.pct > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-[7px] bg-primary px-[9px] py-1 font-display text-[0.74rem] font-bold text-white">-{deal.pct}%</span>
        )}
        {deal.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.image} alt={deal.name} className="h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span className="font-display text-xl font-bold text-ink/25">NXT</span>
        )}
      </div>
      <div className="px-[15px] pb-4 pt-3.5">
        <h3 className="product-card-title line-clamp-2 h-[2.6em] leading-[1.3] text-ink transition group-hover:text-primary">{deal.name}</h3>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="font-display text-[1.15rem] font-extrabold text-primary">{formatMoney(deal.price, deal.currency)}</span>
          {deal.pct > 0 && deal.original !== null && (
            <span className="text-[0.82rem] text-ink/45 line-through">{formatMoney(deal.original, deal.currency)}</span>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[0.72rem] text-ink/55">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />{deal.merchant}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------- Trending card */
function TrendingCard({ product }: { product: CommerceProduct }) {
  const best = bestOffer(collectOfferRows(product));
  const price = best ? offerPrice(best.offer) : null;
  const image = productImageUrl(product);
  const category = product.categories?.[0]?.name ?? product.category ?? 'Product';
  return (
    <div className="group flex flex-col rounded-2xl border border-ink/10 bg-white p-[18px] transition hover:-translate-y-1.5 hover:shadow-[0_26px_46px_-26px_rgba(13,27,42,0.42)]">
      <Link href={`/products/${product.slug}`} className="mb-3.5 grid aspect-square place-items-center overflow-hidden rounded-[11px] bg-white">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="h-full w-full object-contain p-3 mix-blend-multiply transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span className="font-display text-lg font-bold text-ink/25">NXT</span>
        )}
      </Link>
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.05em] text-primary">{category}</span>
      <Link href={`/products/${product.slug}`}>
        <h3 className="product-card-title mb-3 mt-1.5 line-clamp-2 h-[3.4em] leading-[1.3] text-ink transition group-hover:text-primary">{product.name}</h3>
      </Link>
      <div className="mt-auto flex items-center justify-between border-t border-ink/10 pt-3">
        <div className="text-[0.74rem] text-ink/55">
          From<b className="block font-display text-[1.1rem] font-extrabold text-ink">{price !== null ? formatMoney(price, best?.offer.currency ?? 'USD') : 'Check price'}</b>
        </div>
        <Link href={`/products/${product.slug}`} className="rounded-[9px] bg-primary px-3.5 py-2 font-display text-[0.8rem] font-semibold text-white transition group-hover:bg-primary-emphasis">Compare</Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- How it works */
function HowItWorks() {
  const steps = [
    { n: '01', t: 'Search any product', d: 'Find it once — we pull matching listings from across the major marketplaces.' },
    { n: '02', t: 'Compare every price', d: 'See offers from Amazon, eBay and more side by side, with condition and availability.' },
    { n: '03', t: 'Track & buy at the low', d: 'Watch the price history and buy when it hits its lowest — never overpay again.' },
  ];
  return (
    <section className="py-14 sm:py-[72px]" data-testid="home-how">
      <div className="mx-auto max-w-[1366px] px-6">
        <div className="relative overflow-hidden rounded-[28px] bg-ink px-8 py-14 text-white sm:px-14 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-32 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(21,86,238,0.3),transparent_64%)]" />
          <p className="relative text-[0.74rem] font-bold uppercase tracking-[0.16em] text-primary">How NXT.Bargains works</p>
          <h2 className="relative mt-2.5 max-w-[20ch] font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold leading-tight tracking-[-0.02em]">
            From “is this a good price?” to “bought it for less.”
          </h2>
          <div className="relative z-[2] mt-[46px] grid gap-[30px] sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 font-display text-[1.05rem] font-extrabold text-primary">{s.n}</div>
                <h3 className="mt-4 font-display text-[1.2rem] font-semibold">{s.t}</h3>
                <p className="mt-2 text-[0.92rem] leading-[1.55] text-white/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Final CTA */
function FinalCta() {
  const feats: [string, string][] = [
    ['✓', 'Compare every marketplace'],
    ['📈', 'Price history & drops'],
    ['⚡', 'Free, no signup'],
  ];
  return (
    <section className="py-16 text-center sm:py-[84px]" data-testid="home-cta">
      <div className="mx-auto max-w-[1366px] px-6">
        <h2 className="mx-auto max-w-[18ch] font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink">
          Start with one product. Stop overpaying on all of them.
        </h2>
        <p className="mx-auto mt-[18px] max-w-[46ch] text-[1.05rem] text-ink/55">
          Compare prices across marketplaces and read the guides before you buy.
        </p>
        <div className="mt-[30px] flex flex-wrap justify-center gap-3.5">
          <Link href="/products" className="rounded-xl bg-primary px-[30px] py-[15px] font-display text-[0.98rem] font-bold text-white transition hover:-translate-y-0.5 hover:bg-primary-emphasis">Browse products</Link>
          <Link href="/deals" className="rounded-xl border border-ink/10 bg-white px-[30px] py-[15px] font-display text-[0.98rem] font-bold text-ink transition hover:-translate-y-0.5 hover:border-ink">Read buying guides</Link>
        </div>
        <div className="mt-[46px] flex flex-wrap justify-center gap-9">
          {feats.map(([ic, label]) => (
            <div key={label} className="flex items-center gap-2.5 text-[0.9rem] text-ink/55">
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-primary/10 text-primary">{ic}</span>{label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
