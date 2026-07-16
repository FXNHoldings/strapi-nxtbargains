import Link from 'next/link';
import { sourceLogoForStore, type CouponStoreLink } from '@/lib/coupon-store-links';

function StoreLogo({ name, logo, className }: { name: string; logo?: string | null; className: string }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={`${name} logo`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${className} shrink-0 rounded-lg bg-white object-contain`}
    />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center rounded-lg bg-paper font-display text-[0.78rem] font-extrabold uppercase text-ink`}>
      {name.slice(0, 3)}
    </span>
  );
}

export default function StoreLinkTile({
  store,
  newTab = false,
}: {
  store: CouponStoreLink;
  newTab?: boolean;
}) {
  const logo =
    sourceLogoForStore(store.name) ||
    (store.domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(store.domain)}&sz=128` : store.logo || null);

  return (
    <Link
      href={store.href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className="group flex min-h-[80px] items-center gap-3 border border-ink/10 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_16px_32px_-22px_rgba(13,27,42,0.4)]"
    >
      <StoreLogo name={store.name} logo={logo} className="h-11 w-12" />
      <span className="min-w-0">
        <span className="block truncate font-display text-sm font-bold text-ink group-hover:text-primary">{store.name}</span>
        <span className="mt-0.5 block truncate text-[0.72rem] font-semibold text-primary/80 group-hover:text-primary">
          View coupons →
        </span>
      </span>
    </Link>
  );
}
