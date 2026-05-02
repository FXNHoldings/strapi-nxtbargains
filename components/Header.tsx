import Link from 'next/link';
import Image from 'next/image';
import { SITE, SECTIONS } from '@/lib/site';

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur"
      data-testid="site-header"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
        <Link href="/" className="block shrink-0" data-testid="logo-link" aria-label={`${SITE.name} home`}>
          <Image
            src="/nxt_bargains_logo.png"
            alt={SITE.name}
            width={450}
            height={218}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <form
          action="/search"
          method="get"
          role="search"
          className="hidden md:flex h-10 w-full max-w-sm items-center gap-2 rounded-full border border-ink/15 bg-white px-4 transition focus-within:border-primary"
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
            className="h-4 w-4 shrink-0 text-ink/50"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <label htmlFor="header-search-input" className="sr-only">Search {SITE.name}</label>
          <input
            id="header-search-input"
            type="search"
            name="q"
            placeholder="Search products, brands, guides…"
            className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/45"
            data-testid="header-search-input"
          />
        </form>

        <nav className="ml-auto hidden md:block font-urbanist" data-testid="primary-nav">
          <ul className="flex items-center gap-1 text-base font-semibold tracking-[0.2px]">
            {SECTIONS.slice(0, 3).map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/${s.slug}`}
                  className="inline-flex items-center px-3 py-2 text-ink transition-colors hover:text-primary"
                  data-testid={`nav-${s.slug}`}
                >
                  {s.short}
                </Link>
              </li>
            ))}

            <li className="group/all relative" data-testid="nav-item-all-articles">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-ink transition-colors hover:text-primary"
                data-testid="nav-all-articles"
                aria-haspopup="true"
              >
                All Articles
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 opacity-60"
                  aria-hidden
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                className="invisible absolute right-0 top-full z-10 mt-1 min-w-[220px] rounded-md border border-ink/10 bg-white p-1 opacity-0 shadow-md transition duration-150 group-hover/all:visible group-hover/all:opacity-100 group-focus-within/all:visible group-focus-within/all:opacity-100"
                role="menu"
                data-testid="nav-all-articles-dropdown"
              >
                {SECTIONS.slice(3).map((s) => (
                  <Link
                    key={s.slug}
                    href={`/${s.slug}`}
                    className="block rounded px-3 py-2 text-sm text-ink transition-colors hover:bg-ink/5 hover:text-primary"
                    role="menuitem"
                    data-testid={`nav-all-${s.slug}`}
                  >
                    {s.title}
                  </Link>
                ))}
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
