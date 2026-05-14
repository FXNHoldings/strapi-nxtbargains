import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE, SECTIONS } from '@/lib/site';

const CONTACT_EMAIL = 'hello@nxt.bargains';

const toolLinks = [
  { href: '/products', label: 'Product Prices' },
  { href: '/deals', label: 'Deal Hub' },
  { href: '/search', label: 'Search' },
  { href: '/product-comparisons', label: 'Compare' },
];

const companyLinks = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/sitemap', label: 'Sitemap' },
  { href: '/feed.xml', label: 'RSS Feed' },
];

const legalLinks = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/cookies', label: 'Cookies' },
];

const footerStats = [
  ['Live', 'merchant offers'],
  ['Smart', 'price history'],
  ['Shared', 'product catalog'],
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-ink/10 bg-[#0b1220] text-white" data-testid="site-footer">
      <div className="mx-auto max-w-[1366px] px-4 py-5 sm:px-6">
        <div className="grid border border-white/10 bg-white/[0.03] md:grid-cols-3">
          {footerStats.map(([label, text]) => (
            <div key={label} className="flex items-center gap-4 border-white/10 px-5 py-4 md:border-r md:last:border-r-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/60 bg-primary text-sm font-bold">
                {label.slice(0, 1)}
              </span>
              <p className="text-sm leading-5 text-white/70">
                <span className="block font-display text-base font-bold text-white">{label}</span>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1366px] gap-10 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[minmax(280px,1.15fr)_minmax(0,1.85fr)_minmax(260px,0.9fr)]">
        <section>
          <Link href="/" className="inline-flex bg-white px-4 py-3" aria-label={`${SITE.name} home`}>
            <Image
              src="/nxt_bargains_logo.png"
              alt={SITE.name}
              width={210}
              height={60}
              className="h-12 w-auto object-contain"
            />
          </Link>

          <p className="mt-6 max-w-sm text-base leading-7 text-white/70">
            Side-by-side prices, deal signals, buying guides, and product notes for shoppers who like the numbers before the checkout button.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products" className="bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-emphasis">
              Browse Prices
            </Link>
            <Link href="/deals" className="border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-primary hover:text-primary">
              Find Deals
            </Link>
          </div>
        </section>

        <nav className="grid gap-8 sm:grid-cols-3" aria-label="Footer navigation">
          <FooterColumn title="Bargain Tools" links={toolLinks} />
          <FooterColumn
            title="Buying Guides"
            links={SECTIONS.slice(0, 4).map((section) => ({
              href: `/${section.slug}`,
              label: section.short,
            }))}
          />
          <FooterColumn title="NXT.Bargains" links={companyLinks} />
        </nav>

        <section className="border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f6b63d]">Deal Desk</p>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white">
            Know a store or feed we should track?
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Send merchant tips, product lists, and partnership notes to the NXT.Bargains team.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-5 block break-all font-display text-xl font-bold text-white transition hover:text-[#f6b63d]"
          >
            {CONTACT_EMAIL}
          </a>

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
        </section>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1366px] flex-col gap-4 px-4 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Copyright © {year} {SITE.name}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
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
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/75 transition hover:text-[#f6b63d]">
              {link.label}
            </Link>
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
      className="inline-flex h-10 w-10 items-center justify-center border border-white/15 text-white/70 transition hover:border-primary hover:bg-primary hover:text-white"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
