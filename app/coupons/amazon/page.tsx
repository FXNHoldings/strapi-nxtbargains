import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE } from '@/lib/site';

const COUPON_REVALIDATE_SECONDS = 86400;

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Amazon Coupons',
  description:
    'Browse Amazon promo codes, coupon deals, discount percentages, and verified Amazon offer links from NXT.Bargains.',
  alternates: { canonical: '/coupons/amazon' },
};

type ApiRecord = Record<string, unknown>;

type AmazonCoupon = {
  asin: string;
  title: string;
  category: string;
  code?: string;
  couponText?: string;
  discount: string;
  listedPrice?: string;
  promoPrice?: string;
  couponPrice?: string;
  combinedPrice?: string;
  href: string;
  image?: string;
  merchant: string;
  postedAt?: string;
};

const AMAZON_DEALS_HOST = process.env.RAPIDAPI_AMAZON_DEALS_HOST || 'amazon-promo-codes-and-deals.p.rapidapi.com';
const AMAZON_DEALS_PATH =
  process.env.RAPIDAPI_AMAZON_DEALS_PATH ||
  '/deals.php?limit=20&offset=0&merchant=Amazon&condition=New';

async function fetchAmazonDeals(): Promise<unknown | null> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://${AMAZON_DEALS_HOST}${AMAZON_DEALS_PATH}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': AMAZON_DEALS_HOST,
        'x-rapidapi-key': key,
      },
      next: { revalidate: COUPON_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nestedRecord(record: ApiRecord, key: string): ApiRecord {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function textField(record: ApiRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function recordsFrom(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  const deals = value.deals;
  return Array.isArray(deals) ? deals.filter(isRecord) : [];
}

function mapAmazonCoupon(record: ApiRecord): AmazonCoupon | null {
  const pricing = nestedRecord(record, 'pricing');
  const promo = nestedRecord(record, 'promo');
  const coupon = nestedRecord(record, 'coupon');
  const urls = nestedRecord(record, 'urls');
  const offer = nestedRecord(record, 'offer');

  const title = textField(record, ['product_name', 'productName', 'title', 'name']);
  const href = textField(urls, ['affiliate', 'product']) || textField(promo, ['promo_url', 'promoUrl']);
  if (!title || !href) return null;

  const totalDiscount = textField(record, ['total_discount_pct', 'totalDiscountPct']);
  const promoDiscount = textField(promo, ['discount_pct', 'discountPct']);
  const couponText = textField(coupon, ['raw']);

  return {
    asin: textField(record, ['asin']) || title,
    title,
    category: textField(record, ['category']) || 'Amazon',
    code: textField(promo, ['code']) || undefined,
    couponText: couponText || undefined,
    discount: totalDiscount ? `${totalDiscount}% off` : promoDiscount ? `${promoDiscount}% promo` : couponText || 'Amazon coupon',
    listedPrice: textField(pricing, ['listed_price', 'listedPrice']) || undefined,
    promoPrice: textField(pricing, ['price_after_promo_only', 'priceAfterPromoOnly']) || undefined,
    couponPrice: textField(pricing, ['price_after_coupon_only', 'priceAfterCouponOnly']) || undefined,
    combinedPrice: textField(pricing, ['estimated_combined_price', 'estimatedCombinedPrice']) || undefined,
    href,
    image: textField(urls, ['image']) || undefined,
    merchant: textField(offer, ['merchant']) || 'Amazon',
    postedAt: textField(record, ['posted_at', 'postedAt']) || undefined,
  };
}

async function listAmazonCoupons(): Promise<AmazonCoupon[]> {
  const data = await fetchAmazonDeals();
  const seen = new Set<string>();
  return recordsFrom(data)
    .map(mapAmazonCoupon)
    .filter((coupon): coupon is AmazonCoupon => coupon !== null)
    .filter((coupon) => {
      const key = `${coupon.asin}|${coupon.code ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24);
}

export default async function AmazonCouponsPage() {
  const coupons = await listAmazonCoupons();
  const liveCodes = coupons.filter((coupon) => coupon.code).length;
  const liveDeals = coupons.length;
  const topOffer = coupons[0]?.discount ?? 'Live offers';
  const updatedLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Amazon Coupons',
    url: `${SITE.url}/coupons/amazon`,
    description: metadata.description,
    hasPart: coupons.map((coupon) => ({
      '@type': 'Offer',
      name: `${coupon.discount}: ${coupon.title}`,
      sku: coupon.asin,
      category: coupon.category,
      url: coupon.href,
      description: coupon.couponText || coupon.code || coupon.discount,
    })),
  };

  return (
    <main className="bg-white" data-testid="amazon-coupons-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-[1366px] px-6 py-10 lg:py-14">
          <nav className="flex flex-wrap gap-2 text-sm font-semibold text-ink/55" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/coupons" className="hover:text-primary">Coupons</Link>
            <span>/</span>
            <span className="text-ink">Amazon</span>
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,60%)_minmax(0,40%)]">
            <div className="min-w-0">
              <p className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-primary">
                Amazon coupons
              </p>
              <h1 className="mt-4 max-w-4xl font-display font-bold leading-[1.04] text-ink">
                Amazon promo codes and coupon deals.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
                Use these Amazon-only promo codes and coupon deals to save on home, kitchen,
                sports, apparel, electronics, baby products, and more.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/55">
                Coupon data is pulled from the Amazon Promo Codes And Deals API and refreshed daily
                to respect the free-plan request limits. NXT.Bargains may earn a commission from qualifying links.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/coupons"
                  className="inline-flex border border-ink/10 bg-paper px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink/70 transition hover:border-primary hover:text-primary"
                >
                  All coupons
                </Link>
                <a
                  href="https://rapidapi.com/dstanitski/api/amazon-promo-codes-and-deals"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex border border-ink/10 bg-paper px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink/70 transition hover:border-primary hover:text-primary"
                >
                  API source
                </a>
              </div>
            </div>

            <aside className="border border-ink/10 bg-paper p-6">
              <h3 className="font-display !text-[1.5rem] font-bold text-ink">Amazon offers summary</h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <SummaryStat label="Live codes" value={String(liveCodes)} />
                <SummaryStat label="Live deals" value={String(liveDeals)} />
                <SummaryStat label="Top offer" value={topOffer} />
                <SummaryStat label="Last updated" value={updatedLabel} />
              </div>
              <p className="mt-5 text-sm leading-6 text-ink/60">
                Final eligibility, price, and code validity are confirmed at Amazon checkout.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1366px] px-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-primary">
                    Live Amazon feed
                  </p>
                  <h2 className="mt-2 font-display font-bold text-ink">Current Amazon coupon offers</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-ink/55">
                  Newest API results, sorted into coupon cards with promo-code and price details.
                </p>
              </div>

              {coupons.length > 0 ? (
                <div className="mt-8 grid min-w-0 gap-5">
                  {coupons.map((coupon) => (
                    <AmazonCouponCard key={`${coupon.asin}-${coupon.code ?? coupon.href}`} coupon={coupon} />
                  ))}
                </div>
              ) : (
                <div className="mt-8 border border-ink/10 bg-white p-8">
                  <h2 className="font-display text-2xl font-bold text-ink">No Amazon coupons available right now.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">
                    The Amazon API returned no matching deals for the current filters. The page will refresh again on the next daily revalidation.
                  </p>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <SidePanel title="About Amazon" bodyClassName="text-[1rem]">
                <p>
                  Amazon started in 1994 as an online bookstore and has grown into one of the
                  world&apos;s largest shopping marketplaces. Today, shoppers use Amazon for
                  electronics, home and kitchen products, clothing, beauty, books, toys, groceries,
                  sports gear, pet supplies, Amazon devices, and everyday essentials.
                </p>
                <p className="mt-3">
                  Amazon operates dedicated stores in many countries, including the United States,
                  United Kingdom, Australia, Canada, Germany, France, Italy, Spain, Japan, India,
                  Mexico, Brazil, Singapore, the United Arab Emirates, and Saudi Arabia. Product
                  selection, shipping speed, Prime benefits, prices, and coupon eligibility can vary
                  by country, delivery postcode, seller, and fulfilment method.
                </p>
                <p className="mt-3">
                  This page focuses on Amazon coupon and promo-code offers from the live feed. Before
                  buying, check the product page and checkout screen to confirm that the code applies
                  in your location and that the final price matches the expected discount.
                </p>
              </SidePanel>
              <SidePanel title="Quick tips">
                <ul className="space-y-2">
                  <li>Check whether a promo code and coupon can stack before checkout.</li>
                  <li>Compare the listed price against the promo-only and coupon-only prices.</li>
                  <li>Use Prime shipping and Subscribe &amp; Save where eligible for extra savings.</li>
                </ul>
              </SidePanel>
            </aside>
          </div>
        </div>
      </section>

      {coupons.length > 0 && (
        <section className="border-t border-ink/10 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-[1366px] px-6">
            <SectionHead
              eyebrow="Most popular"
              title="Amazon codes and discounts summary"
              intro="A compact view of the first live Amazon offers currently available from the feed."
            />
            <div className="mt-8 overflow-x-auto border border-ink/10">
              <table className="w-full min-w-[760px] border-collapse bg-white text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-[0.12em] text-ink/50">
                  <tr>
                    <th className="px-4 py-3">Offer</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {coupons.slice(0, 6).map((coupon) => (
                    <tr key={`summary-${coupon.asin}-${coupon.code ?? coupon.href}`}>
                      <td className="px-4 py-4 font-semibold text-ink">{coupon.title}</td>
                      <td className="px-4 py-4 text-ink/70">{coupon.code || 'No code shown'}</td>
                      <td className="px-4 py-4 font-bold text-primary">{coupon.discount}</td>
                      <td className="px-4 py-4 text-ink/60">{coupon.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-ink/10 bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-[1366px] gap-8 px-6 lg:grid-cols-2">
          <GuideBlock
            eyebrow="How to use"
            title="How to use Amazon promo codes"
            items={[
              'Choose an Amazon offer and open it with the View on Amazon button.',
              'Copy the promo code shown on the coupon card when one is available.',
              'Add the eligible product to your cart and proceed to checkout.',
              'Paste the code into Amazon’s promotional code field and apply it.',
              'Confirm the final price before placing the order.',
            ]}
          />
          <GuideBlock
            eyebrow="FAQ"
            title="Amazon coupon questions"
            items={[
              'Do Amazon promo codes always work? Codes can expire or run out of claims, so verify at checkout.',
              'Can coupons and promo codes stack? Sometimes they do, but Amazon controls the final checkout rules.',
              'Why do estimated prices differ? Estimated combined prices assume discounts stack and should be treated as best-case.',
              'How often is this page updated? The page refreshes daily to stay within the free API plan.',
            ]}
          />
        </div>
      </section>
    </main>
  );
}

function AmazonCouponCard({ coupon }: { coupon: AmazonCoupon }) {
  return (
    <article className="group grid min-w-0 gap-0 border border-ink/10 bg-white transition hover:-translate-y-0.5 hover:border-primary md:grid-cols-[180px_minmax(0,1fr)_190px]">
      <a href={coupon.href} target="_blank" rel="noopener noreferrer sponsored" className="block border-b border-ink/10 bg-white p-5 md:border-b-0 md:border-r">
        {coupon.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coupon.image} alt={coupon.title} className="mx-auto h-36 w-full max-w-full object-contain transition group-hover:scale-[1.02]" />
        ) : (
          <div className="grid h-36 place-items-center bg-muted font-display text-2xl font-bold text-primary">
            Amazon
          </div>
        )}
      </a>

      <div className="min-w-0 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-[#e9f7ef] px-3 py-1 text-xs font-bold text-[#16794a]">
            {coupon.code ? 'Code' : 'Discount'}
          </span>
          <span className="text-right text-xs font-bold uppercase tracking-[0.12em] text-primary">{coupon.category}</span>
        </div>

        <a href={coupon.href} target="_blank" rel="noopener noreferrer sponsored">
          <h4 className="mt-4 break-words !font-sans !text-[1.2rem] !font-[500] leading-6 text-ink transition group-hover:text-primary">
            {coupon.title}
          </h4>
        </a>

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBlock label="Promo code" value={coupon.code || 'No code shown'} dashed />
          <InfoBlock label="Coupon" value={coupon.couponText || 'Check Amazon'} />
          <InfoBlock label="Listed price" value={coupon.listedPrice || 'See Amazon'} />
          <InfoBlock label="Best estimate" value={coupon.combinedPrice || coupon.promoPrice || coupon.couponPrice || 'See Amazon'} />
        </div>
      </div>

      <div className="min-w-0 flex flex-col justify-center border-t border-ink/10 p-5 md:border-l md:border-t-0">
        <p className="font-display text-2xl font-bold text-primary">{coupon.discount}</p>
        <p className="mt-2 text-xs leading-5 text-ink/45">
          Merchant: {coupon.merchant}{coupon.postedAt ? ` | Posted ${coupon.postedAt}` : ''}
        </p>
        <a
          href={coupon.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-5 inline-flex w-full items-center justify-center bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis"
        >
          {coupon.code ? 'Get code' : 'Get discount'}
        </a>
      </div>
    </article>
  );
}

function InfoBlock({ label, value, dashed = false }: { label: string; value: string; dashed?: boolean }) {
  return (
    <div className={`bg-paper p-3 ${dashed ? 'border border-dashed border-ink/20' : 'border border-ink/10'}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function SummaryStat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`border border-ink/10 bg-white p-4 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-1 font-display font-bold text-ink">{value}</p>
    </div>
  );
}

function SidePanel({ title, children, bodyClassName = '' }: { title: string; children: ReactNode; bodyClassName?: string }) {
  return (
    <div className="border border-ink/10 bg-white p-6 text-sm leading-6 text-ink/65">
      <h3 className="font-display !text-[1.5rem] font-bold text-ink">{title}</h3>
      <div className={`mt-4 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display font-bold text-ink">{title}</h2>
      <p className="mt-2 text-[0.98rem] leading-relaxed text-ink/60">{intro}</p>
    </div>
  );
}

function GuideBlock({ eyebrow, title, items }: { eyebrow: string; title: string; items: string[] }) {
  return (
    <section className="border border-ink/10 bg-white p-6">
      <p className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display font-bold text-ink">{title}</h2>
      <ol className="mt-5 space-y-3 text-sm leading-6 text-ink/65">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center bg-muted text-xs font-bold text-primary">
              {items.indexOf(item) + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
