import Link from 'next/link';
import { listPosts, type NxtPost } from '@/lib/strapi';
import { SECTIONS, SITE, type Section } from '@/lib/site';
import PostCard from '@/components/PostCard';

export const revalidate = 60;

export default async function HomePage() {
  const perSection = await Promise.all(
    SECTIONS.map((s) =>
      listPosts({ category: s.slug, pageSize: 5 })
        .then((r) => r.data)
        .catch(() => [] as NxtPost[]),
    ),
  );

  const bySection: Record<string, NxtPost[]> = Object.fromEntries(
    SECTIONS.map((s, i) => [s.slug, perSection[i]]),
  );

  const latest: NxtPost[] = [];
  const seen = new Set<number>();
  for (const post of perSection
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    latest.push(post);
  }
  const hero = latest[0];
  const sideTop = latest.slice(1, 5);

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

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-12" data-testid="home-hero">
        {hero ? (
          <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
            <PostCard post={hero} variant="feature" />
            <div className="grid gap-6 sm:grid-cols-2">
              {sideTop.map((p) => (
                <PostCard key={p.id} post={p} variant="tile" />
              ))}
            </div>
          </div>
        ) : (
          <EmptyHero />
        )}
      </section>

      {/* Section blocks */}
      {SECTIONS.map((s) => {
        const posts = bySection[s.slug] ?? [];
        if (posts.length === 0) return <EmptySection key={s.slug} section={s} />;
        return <SectionBlock key={s.slug} section={s} posts={posts} />;
      })}
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="rounded-3xl border border-dashed border-ink/15 px-6 py-20 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">{SITE.name}</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">{SITE.tagline}</h1>
      <p className="mx-auto mt-4 max-w-xl text-ink/70">
        Nothing’s published yet. Once you import posts into the CMS, they’ll appear here.
      </p>
    </div>
  );
}

function EmptySection({ section }: { section: Section }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12" data-testid={`section-${section.slug}-empty`}>
      <SectionHeader section={section} />
      <div className="mt-6 rounded-3xl border border-dashed border-ink/15 px-6 py-12 text-center">
        <p className="text-sm text-ink/55">No posts in {section.title} yet.</p>
      </div>
    </section>
  );
}

function SectionBlock({ section, posts }: { section: Section; posts: NxtPost[] }) {
  const [feature, ...rest] = posts;
  return (
    <section
      className={section.slug === 'product-comparisons' ? 'bg-muted/60 py-16' : 'py-16'}
      data-testid={`section-${section.slug}`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader section={section} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <PostCard post={feature} variant="feature" />
          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {rest.slice(0, 4).map((p) => (
              <PostCard key={p.id} post={p} variant="compact" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ section }: { section: Section }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {section.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink/65 sm:text-base">{section.blurb}</p>
      </div>
      <Link
        href={`/${section.slug}`}
        className="inline-flex w-fit items-center rounded-full border border-ink/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-primary hover:text-primary"
      >
        See all
      </Link>
    </div>
  );
}
