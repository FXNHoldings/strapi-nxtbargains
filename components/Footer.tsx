import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE, SECTIONS } from '@/lib/site';

const CONTACT_EMAIL = 'hello@nxt.bargains';

// Major marketplaces we compare across (global focus, not UK-specific).
const MARKETPLACES = ['Amazon', 'eBay', 'Walmart', 'AliExpress', 'Best Buy', 'Target', 'Newegg'];

const shopLinks = [
  { href: '/products', label: 'All products' },
  { href: '/deals', label: "Today's deals" },
  { href: '/search', label: 'Search & compare' },
  { href: '/product-comparisons', label: 'Comparisons' },
];

const companyLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/sitemap', label: 'Sitemap' },
  { href: '/feed.xml', label: 'RSS feed' },
  { href: '/contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/legal/terms', label: 'Terms and Conditions' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
];

const valueProps: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: 'Compare every marketplace',
    text: 'One product, side-by-side prices from Amazon, eBay & more.',
    icon: <><path d="M3 6h7M3 12h7M3 18h7" /><path d="M14 6h7M14 12h7M14 18h7" /></>,
  },
  {
    title: 'Price history & drops',
    text: "See an item's lowest price and buy at the right moment.",
    icon: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></>,
  },
  {
    title: 'Free, no signup',
    text: 'Just search a product and start saving — nothing to install.',
    icon: <><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" /><path d="M7.5 7.5h.01" /></>,
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink text-white" data-testid="site-footer">
      {/* value props */}
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-px px-6 sm:grid-cols-3">
          {valueProps.map((v) => (
            <div key={v.title} className="flex items-start gap-4 py-7 sm:px-6 sm:first:pl-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                  {v.icon}
                </svg>
              </span>
              <div>
                <p className="font-display text-sm font-bold text-white">{v.title}</p>
                <p className="mt-1 text-sm leading-6 text-white/55">{v.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* main */}
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[45fr_20fr_25fr_10fr]">
        {/* brand */}
        <section>
          <Link href="/" className="inline-flex" aria-label={`${SITE.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nxt_bargains_logo_light.svg" alt={SITE.name} width={210} height={102} className="h-9 w-auto sm:h-10" />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-7 text-white/60">
            Compare one product across the major marketplaces, track its price history,
            and buy at the lowest price. Never pay full price again.
          </p>
          <div className="mt-6 flex items-center gap-3" data-testid="social-links">
            <SocialLink href={SITE.social.facebook} label={`${SITE.name} on Facebook`}>
              <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99h-2.5V12h2.5V9.83c0-2.47 1.47-3.84 3.73-3.84 1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.23 0-1.61.76-1.61 1.55V12h2.74l-.44 2.89h-2.3v6.99A10 10 0 0 0 22 12Z" />
            </SocialLink>
            <SocialLink href={SITE.social.twitter} label={`${SITE.name} on X`}>
              <path d="M18.244 2H21.5l-7.55 8.63L22.75 22h-6.96l-5.45-7.13L4.04 22H.78l8.08-9.23L1.25 2h7.13l4.93 6.52L18.244 2Zm-1.22 18h1.93L7.06 4H5.04l11.984 16Z" />
            </SocialLink>
            <SocialLink href="/feed.xml" label={`${SITE.name} RSS feed`}>
              <path d="M4 4v3a13 13 0 0 1 13 13h3A16 16 0 0 0 4 4Zm0 6v3a7 7 0 0 1 7 7h3a10 10 0 0 0-10-10Zm2.25 7.25a1.75 1.75 0 1 0 .001 3.501A1.75 1.75 0 0 0 6.25 17.25Z" />
            </SocialLink>
          </div>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-white/40">Tips &amp; partnerships</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 block break-all text-sm font-semibold text-white/80 transition hover:text-accent">
            {CONTACT_EMAIL}
          </a>
        </section>

        <FooterColumn title="Shop" links={shopLinks} />
        <FooterColumn
          title="Buying guides"
          links={SECTIONS.slice(0, 5).map((section) => ({ href: `/${section.slug}`, label: section.short }))}
        />
        <FooterColumn title="About" links={companyLinks} />
      </div>

      {/* marketplace strip */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
          <span className="text-white/55">Comparing prices across</span>
          {MARKETPLACES.map((m) => (
            <span key={m} className="rounded-full border border-white/12 px-3 py-1 text-white/65">{m}</span>
          ))}
          <span className="rounded-full bg-primary px-3 py-1 text-white">+ more</span>
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {SITE.name}. Independent price comparison — we may earn a commission on some links.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <section>
      <h2 className="!text-[1.1rem] font-bold capitalize text-white">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/70 transition hover:text-accent">{link.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:border-primary hover:bg-primary hover:text-white"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
