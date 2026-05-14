import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost, listPosts, mediaUrl, type NxtPost } from '@/lib/strapi';
import { SECTIONS, SITE } from '@/lib/site';
import { firstImageUrl, fmtDate, primaryCategorySlug, postPath } from '@/lib/format';
import PostContent from '@/components/PostContent';
import PostCard from '@/components/PostCard';
import PostPriceComparison from '@/components/PostPriceComparison';

export const revalidate = 60;
export const dynamicParams = true;

type Params = { category: string; slug: string };

function categoryName(slug?: string): string {
  if (!slug) return '';
  return SECTIONS.find((s) => s.slug === slug)?.title ?? slug.replace(/-/g, ' ');
}

function recentPostDate(iso?: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, category } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) return { title: 'Not found' };

  const cover = mediaUrl(post.coverImage ?? null) || mediaUrl(post.ogImage ?? null);
  const description = post.seoDescription || post.excerpt || SITE.description;

  return {
    title: post.seoTitle || post.title,
    description,
    keywords: post.seoKeywords,
    alternates: { canonical: `/${category}/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.seoTitle || post.title,
      description,
      url: `${SITE.url}/${category}/${post.slug}`,
      images: cover ? [{ url: cover }] : undefined,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: post.seoTitle || post.title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug, category } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) notFound();

  // If the URL category doesn't match the post's primary category, send them to the canonical URL.
  const canonicalCat = primaryCategorySlug(post);
  if (canonicalCat !== category) {
    const { redirect } = await import('next/navigation');
    redirect(postPath(post));
  }

  // Pull a few related posts from the same category, excluding this one.
  const related = await listPosts({ category, pageSize: 5 })
    .then((r) => r.data.filter((p) => p.id !== post.id).slice(0, 4))
    .catch(() => [] as NxtPost[]);

  const recentPosts = await listPosts({ pageSize: 6 })
    .then((r) => r.data.filter((p) => p.id !== post.id).slice(0, 5))
    .catch(() => [] as NxtPost[]);

  const cover = mediaUrl(post.coverImage ?? null) ?? firstImageUrl(post.content);
  const cat = post.categories?.[0];

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': post.postType === 'product-review' ? 'Review' : 'Article',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: cover ? [cover] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.url,
    },
    mainEntityOfPage: `${SITE.url}/${category}/${post.slug}`,
  };

  return (
    <article
      className="bg-white"
      data-testid={`post-${post.slug}`}
      data-category={category}
      data-post-type={post.postType}
    >
      {/* Vendor stylesheets used by the imported product-comparison blocks
          (Content Egg + scoped Bootstrap). Only loaded on post pages. */}
      <link rel="stylesheet" href="/vendor/cegg-bootstrap.min.css" />
      <link rel="stylesheet" href="/vendor/cegg-products.min.css" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6">
        <nav
          className="mt-10 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink/45"
          data-testid="breadcrumb"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="shrink-0 hover:text-primary">Home</Link>
          <span className="shrink-0">/</span>
          <Link href={`/${category}`} className="shrink-0 hover:text-primary">
            {cat?.name ?? categoryName(category)}
          </Link>
        </nav>

        <header className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-center">
          <div>
            {cat && (
              <Link
                href={`/${category}`}
                className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
              >
                {cat.name}
              </Link>
            )}
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/55">
                {post.excerpt}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-ink/40">
                N
              </span>
              <span>By {SITE.name}</span>
              <span>{fmtDate(post.publishedAt)}</span>
              {post.readingTimeMinutes && <span>{post.readingTimeMinutes} min read</span>}
            </div>
          </div>

          {cover && (
            <div className="overflow-hidden" data-testid="post-hero-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={post.coverImage?.alternativeText || post.title}
                className="h-[320px] w-full object-contain sm:h-[420px] lg:h-[500px]"
              />
            </div>
          )}
        </header>

        <div className="mx-auto mt-16 grid max-w-7xl gap-12 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-10 lg:sticky lg:top-28" data-testid="post-side-rail">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Share This Article</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${SITE.url}/${category}/${post.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on Facebook"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                >
                  f
                </a>
                <a
                  href={`https://x.com/intent/tweet?url=${encodeURIComponent(`${SITE.url}/${category}/${post.slug}`)}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on X"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                >
                  X
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(`${SITE.url}/${category}/${post.slug}`)}`}
                  aria-label="Share by email"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                >
                  @
                </a>
              </div>
            </div>

            {recentPosts.length > 0 && (
              <div className="rounded border border-[#d9e4f2] bg-[#f5f9fd] p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#4778e6]">Latest Posts</h2>
                <div className="mt-4 space-y-4">
                  {recentPosts.map((recent) => {
                    const recentImage = mediaUrl(recent.coverImage ?? null) ?? firstImageUrl(recent.content);

                    return (
                      <Link
                        key={recent.id}
                        href={postPath(recent)}
                        className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 transition hover:opacity-80"
                      >
                        <span className="block h-16 w-16 overflow-hidden rounded bg-white">
                          {recentImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={recentImage}
                              alt={recent.coverImage?.alternativeText || recent.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-sm font-normal leading-snug text-[#123d83]">
                            {recent.title}
                          </span>
                          <span className="mt-1 block text-sm font-normal leading-none text-[#6a83aa]">
                            {recentPostDate(recent.publishedAt)}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-display text-xl font-bold text-ink">Newsletter</h2>
              <p className="mt-3 text-sm italic leading-6 text-ink/55">
                Smart buying notes and product picks, no noise.
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-flex rounded-full bg-primary px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-primary-emphasis"
              >
                Subscribe
              </Link>
            </div>
          </aside>

          <div className="min-w-0">
            <PostContent html={post.content} />
            <PostPriceComparison post={post} />

            <div className="mt-14 border-y border-ink/10 py-8 text-sm leading-7 text-ink/60">
              <strong className="text-ink">Affiliate disclosure.</strong> {SITE.name} earns a
              commission when you buy through links on this page, at no extra cost to you.
              Prices and availability are accurate as of {fmtDate(post.updatedAt)} and subject to change.
            </div>

            <div className="mt-10 bg-muted p-8" data-testid="post-author-box">
              <div className="grid gap-6 sm:grid-cols-[72px_minmax(0,1fr)]">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-2xl font-bold text-ink/30">
                  N
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Written by</p>
                  <h2 className="mt-2 font-display text-xl font-bold text-ink">{SITE.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-ink/60">
                    Product comparisons, reviews and practical buying guides for smart tech shoppers.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/contact"
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-primary"
            >
              Leave a comment
            </Link>
          </div>
        </div>

        {related.length > 0 && (
          <aside className="mt-24 border-t border-ink/10 py-16">
            <div className="mx-auto max-w-5xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Editor's Choice</h2>
              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-ink/45">
                More in {cat?.name ?? categoryName(category)}
              </p>
            </div>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <PostCard key={r.id} post={r} variant="tile" />
              ))}
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
