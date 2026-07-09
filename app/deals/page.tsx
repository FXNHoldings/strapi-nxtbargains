import Link from 'next/link';
import type { Metadata } from 'next';
import { listPosts, mediaUrl, type NxtPost } from '@/lib/strapi';
import { SITE } from '@/lib/site';
import { firstImageUrl, fmtDate, postPath, primaryCategorySlug } from '@/lib/format';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Today\'s Best Bargains',
  description: 'Find smart shopping ideas, product deals, buying guides, and price-comparison starting points from NXT.Bargains.',
  alternates: { canonical: '/deals' },
};

const DEAL_CATEGORY_SLUG = 'deals';
type SearchParams = { merchant?: string };
type MerchantFilter = { slug: string; label: string; patterns: string[] };

const MERCHANT_FILTERS: MerchantFilter[] = [
  { slug: 'amazon', label: 'Amazon', patterns: ['amazon', 'amazon.com'] },
  { slug: 'ebay', label: 'eBay', patterns: ['ebay', 'ebay.com'] },
  { slug: 'walmart', label: 'Walmart', patterns: ['walmart', 'walmart.com', 'goto.walmart'] },
  { slug: 'target', label: 'Target', patterns: ['target', 'target.com'] },
  { slug: 'newegg', label: 'Newegg', patterns: ['newegg', 'newegg.com'] },
  { slug: 'bestbuy', label: 'Best Buy', patterns: ['best buy', 'bestbuy', 'bestbuy.com'] },
];

function estimateDealScore(post: NxtPost): number {
  const category = primaryCategorySlug(post);
  const base =
    category === 'product-comparisons'
      ? 88
      : category === 'product-roundups'
        ? 84
        : category === 'product-reviews'
          ? 81
          : 78;
  return Math.min(97, base + ((post.title.length + post.id) % 9));
}

function extractPrice(html?: string): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]*>/g, ' ');
  const match = text.match(/(?:[$£€]\s?\d[\d,.]*|\d[\d,.]*\s?(?:USD|GBP|EUR))/i);
  return match?.[0]?.replace(/\s+/g, ' ').replace(/^([$£€])\1+/, '$1') ?? null;
}

function postImage(post: NxtPost): string | null {
  return mediaUrl(post.coverImage ?? null) ?? mediaUrl(post.ogImage ?? null) ?? firstImageUrl(post.content);
}

function postMerchant(post: NxtPost): MerchantFilter | null {
  const merchantMatch = post.content.match(/<strong>Merchant:<\/strong>\s*([^<]+)/i);
  const text = `${post.title} ${post.sourceUrl ?? ''} ${merchantMatch?.[1] ?? ''} ${post.content}`.toLowerCase();
  return MERCHANT_FILTERS.find((merchant) => merchant.patterns.some((pattern) => text.includes(pattern))) ?? null;
}

function merchantCounts(posts: NxtPost[]) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const merchant = postMerchant(post);
    if (!merchant) continue;
    counts.set(merchant.slug, (counts.get(merchant.slug) ?? 0) + 1);
  }
  return counts;
}

export default async function DealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { merchant: merchantRaw } = await searchParams;
  const selectedMerchant = MERCHANT_FILTERS.find((item) => item.slug === merchantRaw)?.slug ?? 'all';
  const deals = await listPosts({ category: DEAL_CATEGORY_SLUG, pageSize: 24 })
    .then((r) => r.data)
    .catch(() => [] as NxtPost[]);
  const counts = merchantCounts(deals);
  const filteredDeals = selectedMerchant === 'all'
    ? deals
    : deals.filter((post) => postMerchant(post)?.slug === selectedMerchant);

  return (
    <main data-testid="deals-page">
      <section className="bg-paper">
        <div className="mx-auto max-w-[1366px] px-6 pb-0 pt-14 lg:pt-20">
          <div>
            <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.04] text-ink sm:text-5xl">
              Find bargains worth checking before you buy.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
              Deal-focused articles from the NXT.Bargains editors, centered on products worth checking,
              value signals, shopping caveats, and comparison points before you buy.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-paper pb-12 pt-[50px] sm:pb-16" data-testid="deal-grid">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] lg:items-start">
            <aside className="border border-ink/10 bg-white p-5 lg:sticky lg:top-28" data-testid="deals-filter-sidebar">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Filter</p>
              <h2 className="mt-2 font-display !text-[18px] font-bold text-ink">Merchants</h2>
              <div className="mt-5 space-y-2">
                <Link
                  href="/deals"
                  className={`flex items-center justify-between border px-3 py-2 text-sm font-semibold transition ${
                    selectedMerchant === 'all'
                      ? 'border-primary bg-primary text-white'
                      : 'border-ink/10 text-ink/70 hover:border-primary hover:text-primary'
                  }`}
                >
                  <span>All merchants</span>
                  <span>{deals.length}</span>
                </Link>
                {MERCHANT_FILTERS.map((merchant) => {
                  const count = counts.get(merchant.slug) ?? 0;
                  if (!count) return null;

                  return (
                    <Link
                      key={merchant.slug}
                      href={`/deals?merchant=${merchant.slug}`}
                      className={`flex items-center justify-between border px-3 py-2 text-sm font-semibold transition ${
                        selectedMerchant === merchant.slug
                          ? 'border-primary bg-primary text-white'
                          : 'border-ink/10 text-ink/70 hover:border-primary hover:text-primary'
                      }`}
                    >
                      <span>{merchant.label}</span>
                      <span>{count}</span>
                    </Link>
                  );
                })}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredDeals.length > 0 ? (
                  filteredDeals.map((post) => <DealCard key={post.id} post={post} />)
                ) : (
                  <div className="border border-ink/10 bg-white p-8 sm:col-span-2 xl:col-span-3">
                    <h3 className="font-display text-xl font-bold text-ink">No Deals articles yet</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">
                      Publish posts in the Strapi NXT.Bargains category named Deals and they will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DealCard({ post }: { post: NxtPost }) {
  const image = postImage(post);
  const price = extractPrice(post.content);
  const score = estimateDealScore(post);
  const category = post.categories?.[0];

  return (
    <article className="group flex flex-col border border-ink/10 bg-white" data-testid={`deal-${post.slug}`}>
      <Link href={postPath(post)} className="block overflow-hidden bg-white">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={post.coverImage?.alternativeText || post.title}
            className="h-52 w-full object-contain p-5 transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-52 bg-muted" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {category?.name ?? 'Deal'}
          </span>
          <span className="rounded-full bg-[#e9f7ef] px-3 py-1 text-xs font-bold text-[#16794a]">
            {score}% signal
          </span>
        </div>

        <Link href={postPath(post)}>
          <h3 className="mt-4 line-clamp-2 font-display !text-[1rem] font-bold leading-tight text-ink transition group-hover:text-primary">
            {post.title}
          </h3>
        </Link>

        {post.excerpt && <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/60">{post.excerpt}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="border border-ink/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-ink/40">Price seen</p>
            <p className="mt-1 font-display text-sm font-bold text-ink">{price ?? 'Check guide'}</p>
          </div>
          <div className="border border-ink/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-ink/40">Updated</p>
            <p className="mt-1 font-display text-sm font-bold text-ink">{fmtDate(post.updatedAt)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
