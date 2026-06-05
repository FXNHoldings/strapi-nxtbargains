import Link from 'next/link';
import Image from 'next/image';
import { SITE } from '@/lib/site';
import MobileNav from './MobileNav';

const NAV = [
  { href: '/deals', label: 'Deals' },
  { href: '/products', label: 'Products' },
  { href: '/stores', label: 'Stores' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-ink/10 bg-white/85 backdrop-blur"
      data-testid="site-header"
    >
      <div className="mx-auto flex h-16 max-w-[1420px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="block shrink-0"
          data-testid="logo-link"
          aria-label={`${SITE.name} home`}
        >
          <Image
            src="/nxt_bargains_logo.png"
            alt={SITE.name}
            width={450}
            height={218}
            priority
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        {/* Desktop nav — center */}
        <nav
          className="hidden flex-1 justify-end md:flex"
          aria-label="Primary"
          data-testid="primary-nav"
        >
          <ul className="flex items-center gap-1 font-display text-base font-semibold tracking-[0.04em]">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex items-center rounded-lg px-3 py-2 font-display font-semibold text-ink/75 transition hover:bg-ink/[0.04] hover:text-ink"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop right side: Track CTA, then a search icon */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/#home-hero"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 font-display text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis"
            data-testid="header-track-cta"
          >
            Track price
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M5 12h14" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </Link>

          <Link
            href="/search"
            aria-label={`Search ${SITE.name}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink/15 bg-white text-ink/60 transition hover:border-primary hover:text-primary"
            data-testid="header-search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
        </div>

        {/* Mobile: compact track button + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/#home-hero"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis"
            data-testid="header-track-cta-mobile"
          >
            Track
          </Link>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
