import Link from 'next/link';
import { mediaUrl, type NxtPost } from '@/lib/strapi';
import { fmtDate, postPath } from '@/lib/format';

type Variant = 'feature' | 'compact' | 'tile';

export default function PostCard({ post, variant = 'tile' }: { post: NxtPost; variant?: Variant }) {
  const img = mediaUrl(post.coverImage ?? null);
  const href = postPath(post);
  const cat = post.categories?.[0];

  if (variant === 'feature') {
    return (
      <article className="group" data-testid={`feature-${post.slug}`}>
        <Link href={href} className="block overflow-hidden rounded-3xl bg-muted">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={post.coverImage?.alternativeText || post.title}
              className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary-hover to-primary" />
          )}
        </Link>
        <div className="mt-5">
          {cat && (
            <Link href={`/${cat.slug}`} className="text-xs font-bold uppercase tracking-wider text-primary">
              {cat.name}
            </Link>
          )}
          <Link href={href}>
            <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-ink transition group-hover:text-primary">
              {post.title}
            </h3>
          </Link>
          {post.excerpt && (
            <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-6 text-ink/70 sm:text-base">
              {post.excerpt}
            </p>
          )}
          <p className="mt-3 text-xs text-ink/50">
            {fmtDate(post.publishedAt)} · {post.readingTimeMinutes ?? 5} min read
          </p>
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="group py-5 first:pt-0 last:pb-0" data-testid={`compact-${post.slug}`}>
        <Link href={href} className="grid grid-cols-[112px_minmax(0,1fr)] gap-4">
          <div className="overflow-hidden rounded-xl bg-muted">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={post.coverImage?.alternativeText || post.title}
                className="aspect-square h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="aspect-square bg-gradient-to-br from-primary-hover to-primary" />
            )}
          </div>
          <div className="min-w-0">
            {cat && <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{cat.name}</p>}
            <h3 className="mt-1 line-clamp-2 font-display text-base font-bold leading-snug text-ink transition group-hover:text-primary">
              {post.title}
            </h3>
            <p className="mt-2 text-xs text-ink/50">
              {fmtDate(post.publishedAt)} · {post.readingTimeMinutes ?? 5} min
            </p>
          </div>
        </Link>
      </article>
    );
  }

  // tile (default)
  return (
    <article className="group flex flex-col" data-testid={`tile-${post.slug}`}>
      <Link href={href} className="block overflow-hidden rounded-3xl bg-muted">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={post.coverImage?.alternativeText || post.title}
            className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="aspect-[4/3] w-full bg-gradient-to-br from-primary-hover to-primary" />
        )}
      </Link>
      <div className="mt-4">
        {cat && <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{cat.name}</p>}
        <Link href={href}>
          <h3 className="mt-2 line-clamp-2 font-display text-lg font-bold leading-snug text-ink transition group-hover:text-primary">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{post.excerpt}</p>
        )}
        <p className="mt-3 text-xs text-ink/50">
          {fmtDate(post.publishedAt)} · {post.readingTimeMinutes ?? 5} min
        </p>
      </div>
    </article>
  );
}
