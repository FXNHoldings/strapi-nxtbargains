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

const DEAL_CATEGORIES = [
  { slug: 'product-roundups', label: 'Roundup Deals' },
  { slug: 'product-comparisons', label: 'Compare Prices' },
  { slug: 'product-reviews', label: 'Reviewed Picks' },
  { slug: 'top-rated-smart-electronics-devices', label: 'Top Rated' },
] as const;

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

function storeLabel(post: NxtPost): string {
  const content = `${post.sourceUrl ?? ''} ${post.content ?? ''}`.toLowerCase();
  if (content.includes('amazon.')) return 'Amazon';
  if (content.includes('ebay.')) return 'eBay';
  if (content.includes('walmart.')) return 'Walmart';
  if (content.includes('bestbuy.')) return 'Best Buy';
  return 'Multiple stores';
}

function postImage(post: NxtPost): string | null {
  return mediaUrl(post.coverImage ?? null) ?? mediaUrl(post.ogImage ?? null) ?? firstImageUrl(post.content);
}

export default async function DealsPage() {
  const sections = await Promise.all(
    DEAL_CATEGORIES.map((category) =>
      listPosts({ category: category.slug, pageSize: 12 })
        .then((r) => r.data)
        .catch(() => [] as NxtPost[]),
    ),
  );

  const seen = new Set<number>();
  const deals = sections
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    })
    .slice(0, 24);

  const topDeals = deals.slice(0, 3);

  return (
    <main data-testid="deals-page">
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">NXT.Bargains Deals</p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-ink sm:text-5xl">
              Find bargains worth checking before you buy.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg">
              A first version of the NXT shopping hub: deal ideas, product shortlists, comparison
              starting points, and bargain signals pulled from our buying guides.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {DEAL_CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  href={`/${category.slug}`}
                  className="inline-flex rounded-full border border-ink/15 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink transition hover:border-primary hover:text-primary"
                >
                  {category.label}
                </Link>
              ))}
            </div>
          </div>

          <aside className="border border-ink/10 bg-white p-6">
            <h2 className="font-display text-xl font-bold text-ink">What this page will become</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-ink/65">
              <p>Live prices from multiple stores.</p>
              <p>Price history and “buy now or wait” signals.</p>
              <p>Email alerts when a product drops below your target price.</p>
            </div>
          </aside>
        </div>
      </section>

      {topDeals.length > 0 && (
        <section className="bg-white py-12" data-testid="top-deals">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Editor signals</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-ink">Top bargain starting points</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-ink/55">
                Scores are starter editorial signals until live price tracking is connected.
              </p>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {topDeals.map((post) => (
                <DealCard key={post.id} post={post} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-paper py-12 sm:py-16" data-testid="deal-grid">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Browse</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">Latest bargain finds</h2>
            </div>
            <form action="/search" className="flex w-full max-w-sm border border-ink/15 bg-white">
              <label htmlFor="deal-search" className="sr-only">Search deals</label>
              <input
                id="deal-search"
                name="q"
                type="search"
                placeholder="Search products..."
                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-ink/40"
              />
              <button className="bg-ink px-5 text-xs font-bold uppercase tracking-[0.14em] text-white" type="submit">
                Search
              </button>
            </form>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {deals.map((post) => (
              <DealCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function DealCard({ post, featured = false }: { post: NxtPost; featured?: boolean }) {
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
            className={`${featured ? 'h-64' : 'h-52'} w-full object-contain p-5 transition duration-500 group-hover:scale-[1.03]`}
          />
        ) : (
          <div className={`${featured ? 'h-64' : 'h-52'} bg-muted`} />
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
          <h3 className="mt-4 line-clamp-2 font-display text-xl font-bold leading-tight text-ink transition group-hover:text-primary">
            {post.title}
          </h3>
        </Link>

        {post.excerpt && <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/60">{post.excerpt}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="border border-ink/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-ink/40">Price seen</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{price ?? 'Check guide'}</p>
          </div>
          <div className="border border-ink/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-ink/40">Store</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{storeLabel(post)}</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <p className="text-xs text-ink/45">Updated {fmtDate(post.updatedAt)}</p>
          <Link
            href={postPath(post)}
            className="inline-flex rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-primary-emphasis"
          >
            Compare
          </Link>
        </div>
      </div>
    </article>
  );
}
