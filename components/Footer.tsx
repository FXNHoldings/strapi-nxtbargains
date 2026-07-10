import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE } from '@/lib/site';

const shopLinks = [
  { href: '/products', label: 'All products' },
  { href: '/deals', label: "Today's deals" },
  { href: '/coupons', label: 'Coupons & promo codes' },
  { href: '/brands', label: 'Brands' },
  { href: '/search', label: 'Search & compare' },
  { href: '/product-comparisons', label: 'Comparisons' },
];

const guideLinks = [
  { href: '/product-comparisons', label: 'Comparisons' },
  { href: '/product-reviews', label: 'Product Reviews' },
  { href: '/product-roundups', label: 'Product Roundups' },
  { href: '/how-to-guides', label: 'How-to' },
  { href: '/top-rated-smart-electronics-devices', label: 'Top Rated' },
];

const aboutLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/sitemap', label: 'Sitemap' },
  { href: '/feed.xml', label: 'RSS feed' },
  { href: '/contact', label: 'Contact' },
];

const MARKETPLACES = ['Amazon', 'eBay', 'Walmart', 'AliExpress', 'Best Buy', 'Target', 'Newegg'];

const legalLinks = [
  { href: '/legal/terms', label: 'Terms & Conditions' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#232323] pt-[50px] text-sm text-white/70" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-6">
        {/* top: brand + columns */}
        <div className="grid gap-8 border-b border-white/[0.13] pb-8 sm:grid-cols-2 lg:grid-cols-[40%_20%_20%_20%] lg:gap-0">
          {/* brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="mb-4 inline-flex items-center gap-2 font-display text-xl font-extrabold text-white" aria-label={`${SITE.name} home`}>
              <span className="grid h-6 w-6 place-items-center rounded bg-white/[0.08]">
                <span className="h-2.5 w-2.5 -rotate-45 rounded-full border-2 border-primary border-t-transparent" />
              </span>
              NXT<b className="font-extrabold text-primary">.Bargains</b>
            </Link>
            <p className="mb-5 max-w-sm text-sm leading-6 text-white/70">
              Compare one product across the major marketplaces, track its price history,
              and buy at the lowest price. Never pay full price again.
            </p>

            <div className="mb-5 flex gap-2" data-testid="social-links">
              <SocialLink href={SITE.social?.facebook ?? 'https://www.facebook.com/nxtbargains'} label="Facebook">
                <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9.5c0-.3.2-.5.5-.5z" />
              </SocialLink>
              <SocialLink href={SITE.social?.twitter ?? 'https://x.com/nxtbargains'} label="X">
                <path d="M17.5 4h2.7l-5.9 6.7L21 20h-5.4l-4.2-5.5L6.5 20H3.8l6.3-7.2L3 4h5.5l3.8 5L17.5 4zm-1 14.4h1.5L7.5 5.5H5.9l10.6 12.9z" />
              </SocialLink>
              <SocialLink href="/feed.xml" label="RSS feed">
                <circle cx="6.2" cy="17.8" r="2.2" />
                <path d="M4 4v3c7.2 0 13 5.8 13 13h3C20 11.2 12.8 4 4 4zm0 6v3c3.9 0 7 3.1 7 7h3c0-5.5-4.5-10-10-10z" />
              </SocialLink>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary">Tips &amp; partnerships</div>
              <Link href="/contact" className="border-b border-primary/50 pb-px text-sm font-medium text-white transition hover:text-primary">
                hello@nxt.bargains
              </Link>
            </div>
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Buying guides" links={guideLinks} />
          <FooterColumn title="About" links={aboutLinks} />
        </div>

        {/* comparing prices across */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.13] py-6">
          <span className="text-sm font-semibold text-white/60">Comparing prices across</span>
          {MARKETPLACES.map((m) => (
            <b key={m} className="font-display text-sm font-bold text-white/85">{m}</b>
          ))}
          <span className="text-sm font-semibold text-primary">+ more</span>
        </div>

      </div>

      {/* bottom */}
      <div className="mt-6 bg-black">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-white/55 sm:text-sm">
          <span>© {year} {SITE.name}. Independent price comparison — we may earn a commission on some links.</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-white">{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <h5 className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-primary">{title}</h5>
      {links.map((l) => (
        <Link key={l.href + l.label} href={l.href} className="mb-2.5 block text-sm text-white/70 transition hover:pl-1 hover:text-white">
          {l.label}
        </Link>
      ))}
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      aria-label={label}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="grid h-9 w-9 place-items-center rounded border border-white/10 bg-white/[0.07] text-white/80 transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
