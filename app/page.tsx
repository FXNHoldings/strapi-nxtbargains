import Link from 'next/link';
import { SITE } from '@/lib/site';
import {
  listCommerceProducts,
  listPosts,
  type CommerceProduct,
  type NxtPost,
} from '@/lib/strapi';
import {
  formatMoney,
  merchantName,
  numericValue,
  productImageUrl,
} from '@/lib/commerce';
import CommerceProductCard from '@/components/CommerceProductCard';
import PostCard from '@/components/PostCard';
import ProductCarousel from '@/components/ProductCarousel';
import { type BestSeller, type Marketplace } from '@/components/BestSellerCard';
import MarketplaceBestSellers from '@/components/MarketplaceBestSellers';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const revalidate = 60;

// Major marketplaces we focus on (fallback if we can't derive live merchant
// names from offers). Not UK-specific — global marketplaces.
const FALLBACK_MARKETPLACES = [
  'Amazon',
  'eBay',
  'Walmart',
  'AliExpress',
  'Best Buy',
  'Target',
  'Newegg',
  'Etsy',
];

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

  // Choose the offer with the biggest discount (price vs original). This is the
  // "drop" we headline. Ties / no-discount fall back to the cheapest offer.
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
  const [productsRes, posts] = await Promise.all([
    listCommerceProducts({ pageSize: 48 }).catch(() => null),
    listPosts({ pageSize: 6 }).then((r) => r.data).catch(() => [] as NxtPost[]),
  ]);

  const products = productsRes?.data ?? [];
  const productCount = productsRes?.meta?.pagination?.total ?? products.length;

  const deals = products.map(toDeal).filter((d): d is Deal => d !== null);
  const priceDrops = deals.filter((d) => d.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 8);
  const trending = products.slice(0, 8);

  // Real marketplaces we're tracking, derived from live offers; fall back to the curated list.
  const liveMerchants = Array.from(
    new Set(
      products.flatMap((p) => (p.offers ?? []).map((o) => merchantName(o)).filter(Boolean)),
    ),
  );
  const marketplaces = (liveMerchants.length >= 4 ? liveMerchants : FALLBACK_MARKETPLACES).slice(0, 8);

  // Ticker uses real price drops; if none have a discount, show trending names + price.
  const ticker: Deal[] = (priceDrops.length ? priceDrops : deals).slice(0, 8);

  // Best Sellers — one daily JSON cache per marketplace (scripts/fetch-*.mjs).
  // Amazon: fetch-best-sellers.mjs · eBay: fetch-ebay.mjs · Walmart: fetch-walmart.mjs.
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

      <Hero
        productCount={productCount}
        marketplaces={marketplaces}
        ticker={ticker}
      />

      {priceDrops.length >= 3 && (
        <Section
          id="price-drops"
          eyebrow="Live now"
          title="Today's biggest price drops"
          intro="The steepest discounts we're tracking across marketplaces right now."
          cta={{ href: '/products', label: 'All products' }}
          surface="white"
        >
          <ProductCarousel
            items={priceDrops.map((d) => (
              <PriceDropCard key={d.product.id} deal={d} />
            ))}
          />
        </Section>
      )}

      {bestSellerGroups.length > 0 && (
        <Section
          id="best-sellers"
          eyebrow="Top picks"
          title="Best Sellers"
          intro="The top-ranked products across Amazon, eBay and Walmart, refreshed daily."
          surface="paper"
        >
          <MarketplaceBestSellers groups={bestSellerGroups} />
        </Section>
      )}

      {trending.length > 0 && (
        <Section
          id="trending"
          eyebrow="Most compared"
          title="Trending products"
          intro="Popular picks shoppers are comparing across Amazon, eBay and more."
          cta={{ href: '/products', label: 'Browse all' }}
          surface="paper"
        >
          <ProductCarousel
            items={trending.map((p) => (
              <CommerceProductCard key={p.id} product={p} />
            ))}
          />
        </Section>
      )}

      {posts.length > 0 && (
        <Section
          id="guides"
          eyebrow="Read first"
          title="Buying guides & reviews"
          intro="Honest comparisons and reviews to help you buy with confidence."
          cta={{ href: '/deals', label: 'All guides' }}
          surface="white"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <PostCard post={posts[0]} variant="feature" thumbBg="bg-white" />
            <div className="flex flex-col divide-y divide-ink/10">
              {posts.slice(1, 5).map((post) => (
                <PostCard key={post.id} post={post} variant="compact" thumbBg="bg-white" />
              ))}
            </div>
          </div>
        </Section>
      )}

      <HowItWorks />

      <FinalCta />
    </div>
  );
}

/* ----------------------------------------------------------------- Hero */
function Hero({
  productCount,
  marketplaces,
  ticker,
}: {
  productCount: number;
  marketplaces: string[];
  ticker: Deal[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-paper" data-testid="home-hero">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] h-[560px] w-[560px] rounded-full bg-primary/12 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 left-[-10%] h-[460px] w-[460px] rounded-full bg-accent/15 blur-3xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-primary" data-testid="hero-eyebrow">
          <span className="h-px w-10 bg-primary/40" aria-hidden />
          Price tracking · Comparison · Across marketplaces
        </p>

        <h1 className="mt-7 max-w-5xl !text-[40px] font-extrabold leading-[1.04] tracking-tight text-ink sm:!text-6xl md:!text-[70px] lg:!text-[70px]">
          Never pay
          <br className="hidden sm:block" />
          <span className="relative inline-block">
            <span className="relative z-10">full price</span>
            <span aria-hidden className="absolute inset-x-0 bottom-[0.12em] -z-0 h-[0.28em] bg-primary/25" />
          </span>{' '}
          <span className="text-primary">again.</span>
        </h1>

        <p className="mt-7 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg md:text-xl">
          Compare one product across Amazon, eBay and the major marketplaces, see
          its price history, and track it so you buy at the lowest price. One
          search in &mdash; the savings come to you.
        </p>

        <form className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row" action="/search" method="get" role="search" data-testid="hero-track-form">
          <label className="group flex flex-1 items-center gap-3 rounded-2xl border border-ink/15 bg-white px-4 py-3.5 transition focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(21,86,238,0.12)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-ink/40 transition group-focus-within:text-primary" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input type="search" name="q" placeholder="Search a product to compare & track…" autoComplete="off" className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none sm:text-base" aria-label="Product name" />
          </label>
          <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-primary px-7 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis active:bg-primary-pressed">
            Compare prices
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4" aria-hidden>
              <path d="M5 12h14" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
        </form>

        <p className="mt-3 text-xs text-ink/45">Free, no signup needed. Prices compared across the major marketplaces.</p>

        <dl className="mt-14 grid max-w-3xl gap-x-8 gap-y-6 border-t border-ink/10 pt-8 sm:grid-cols-3" data-testid="hero-stats">
          <Stat number={productCount > 0 ? `${productCount.toLocaleString()}+` : 'Live'} label="Products tracked" />
          <Stat number={`${marketplaces.length}+`} label="Marketplaces compared" />
          <Stat number="Daily" label="Price checks" />
        </dl>

        <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-3 text-[11px] font-bold uppercase tracking-[0.22em] text-ink/40" data-testid="hero-merchants">
          <span className="text-ink/55">Comparing prices on</span>
          {marketplaces.map((m) => (
            <span key={m} className="rounded-full border border-ink/12 bg-white px-3 py-1.5 text-ink/70">{m}</span>
          ))}
        </div>
      </div>

      {ticker.length > 0 && (
        <div className="relative border-t border-ink/10 bg-white" data-testid="hero-ticker" aria-label="Recent price drops">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-hidden px-6 py-3">
            <span className="hidden shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink/55 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live drops
            </span>
            <ul className="flex min-w-0 flex-1 items-center gap-8 overflow-hidden text-sm text-ink/75">
              {ticker.map((t) => (
                <li key={t.product.id} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                  <Link href={t.href} className="font-semibold text-ink hover:text-primary">{t.name.length > 40 ? t.name.slice(0, 40) + '…' : t.name}</Link>
                  {t.pct > 0 && t.original !== null && (
                    <span className="text-ink/40 line-through">{formatMoney(t.original, t.currency)}</span>
                  )}
                  <span className="font-bold text-primary">{formatMoney(t.price, t.currency)}</span>
                  {t.pct > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                        <path d="M7 13l5 5 5-5" />
                        <path d="M12 18V6" />
                      </svg>
                      {t.pct}%
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-wider text-ink/35">{t.merchant}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <dt className="font-display !text-2xl font-extrabold tracking-tight text-ink sm:!text-3xl">{number}</dt>
      <dd className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">{label}</dd>
    </div>
  );
}

/* ------------------------------------------------------------- Section shell */
function Section({
  id,
  eyebrow,
  title,
  intro,
  cta,
  surface,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  cta?: { href: string; label: string };
  surface: 'white' | 'paper';
  children: React.ReactNode;
}) {
  return (
    <section className={surface === 'white' ? 'bg-white py-14 sm:py-16' : 'bg-paper py-14 sm:py-16'} data-testid={`home-${id}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
            {intro && <p className="mt-3 text-sm leading-7 text-ink/60 sm:text-base">{intro}</p>}
          </div>
          {cta && (
            <Link href={cta.href} className="inline-flex shrink-0 items-center gap-2 border border-ink/15 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink transition hover:border-primary hover:text-primary">
              {cta.label}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M5 12h14" /><polyline points="13 6 19 12 13 18" />
              </svg>
            </Link>
          )}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- Price drop card */
function PriceDropCard({ deal }: { deal: Deal }) {
  return (
    <article className="group flex h-full flex-col border border-ink/10 bg-white" data-testid={`pricedrop-${deal.product.slug}`}>
      <Link href={deal.href} className="relative block overflow-hidden bg-white">
        {deal.pct > 0 && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">-{deal.pct}%</span>
        )}
        {deal.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.image} alt={deal.name} className="h-44 w-full object-contain p-5 transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <span className="flex h-44 w-full items-center justify-center bg-muted font-display text-xl font-bold text-ink/25">NXT</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={deal.href}>
          <h3 className="product-card-title line-clamp-2 font-display leading-snug text-ink transition group-hover:text-primary">{deal.name}</h3>
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            {deal.pct > 0 && deal.original !== null && (
              <p className="text-xs text-ink/40 line-through">{formatMoney(deal.original, deal.currency)}</p>
            )}
            <p className="font-display text-lg font-bold text-ink">{formatMoney(deal.price, deal.currency)}</p>
          </div>
          <span className="line-clamp-1 text-[11px] uppercase tracking-wider text-ink/40">{deal.merchant}</span>
        </div>
      </div>
    </article>
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
    <section className="bg-ink py-16 text-white sm:py-20" data-testid="home-how">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/55">How NXT.Bargains works</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold sm:text-4xl">From “is this a good price?” to “bought it for less.”</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <p className="font-display text-4xl font-extrabold text-primary">{s.n}</p>
              <h3 className="mt-3 font-display text-xl font-bold">{s.t}</h3>
              <p className="mt-2 text-sm leading-7 text-white/60">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Final CTA */
function FinalCta() {
  return (
    <section className="bg-paper py-16 sm:py-20" data-testid="home-cta">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          Start with one product. Stop overpaying on all of them.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/60 sm:text-base">
          Compare prices across marketplaces and read the guides before you buy.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/products" className="inline-flex items-center gap-2 bg-primary px-7 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis">
            Browse products
          </Link>
          <Link href="/deals" className="inline-flex items-center gap-2 border border-ink/15 bg-white px-7 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-ink transition hover:border-primary hover:text-primary">
            Read buying guides
          </Link>
        </div>
      </div>
    </section>
  );
}
