import Link from 'next/link';
import Image from 'next/image';
import { SECTIONS, SITE } from '@/lib/site';
import MobileNav from './MobileNav';
import StickyHeaderShadow from './StickyHeaderShadow';

const NAV = [
  {
    href: '/products',
    label: 'Products',
    children: [
      { href: '/category/smart-phones', label: 'Smart Phones' },
      { href: '/category/smartwatches', label: 'Smartwatches' },
      { href: '/category/tablets', label: 'Tablets' },
      { href: '/category/laptops', label: 'Laptops' },
      { href: '/category/smart-light-bulbs', label: 'Smart Light Bulbs' },
      { href: '/category/smart-tvs', label: 'Smart TVs' },
      { href: '/category/headphones', label: 'Headphones' },
      { href: '/category/raspberry-pi', label: 'Raspberry PI' },
    ],
  },
  { href: '/best-deals', label: 'Best Deals' },
  {
    href: '/coupons',
    label: 'Coupons',
    children: [
      { href: '/stores', label: 'Stores' },
      { href: '/brands', label: 'Brands' },
    ],
  },
  {
    href: '/deals',
    label: 'Blog',
    children: [
      ...SECTIONS.map((section) => ({
        href: `/${section.slug}`,
        label: section.title,
      })),
      { href: '/deals', label: 'Deals' },
    ],
  },
  { href: '/price-drops', label: 'Price Drops' },
];

const navTestId = (label: string) => `nav-${label.toLowerCase().replace(/\s+/g, '-')}`;

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-ink/10 bg-white/85 backdrop-blur transition-shadow"
      data-testid="site-header"
    >
      <StickyHeaderShadow />
      <div className="mx-auto flex h-16 max-w-[1366px] items-center justify-between gap-4 px-4 sm:h-[84px] sm:px-6">
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
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop nav — center */}
        <nav
          className="hidden flex-1 justify-end md:flex"
          aria-label="Primary"
          data-testid="primary-nav"
        >
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={`${item.label}-${item.href}`} className="group relative">
                <Link
                  href={item.href}
                  className="top-nav-link inline-flex items-center px-3 py-2 font-['Outfit'] text-[#111111] transition hover:text-[#111111]"
                  data-testid={navTestId(item.label)}
                >
                  {item.label}
                  {item.children && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-1.5 h-3.5 w-3.5 text-ink/45"
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  )}
                </Link>
                {item.children && (
                  <div className="invisible absolute left-0 top-full z-50 min-w-[260px] translate-y-2 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <div className="rounded-xl border border-ink/10 bg-white p-2 shadow-xl shadow-ink/10">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="top-nav-dropdown-link block px-3 py-2 font-['Outfit'] text-sm text-ink/75 transition hover:text-primary"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop right side: search icon */}
        <div className="hidden items-center gap-2 md:flex">
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

        {/* Mobile: hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
