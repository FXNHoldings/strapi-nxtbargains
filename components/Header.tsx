import Link from 'next/link';
import { SITE, SECTIONS } from '@/lib/site';

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur"
      data-testid="site-header"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
        <Link href="/" className="block shrink-0 font-display text-2xl font-extrabold tracking-tight text-ink" data-testid="logo-link">
          <span className="text-primary">NXT</span>.<span className="text-ink">Bargains</span>
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

        <nav className="ml-auto hidden md:block" data-testid="primary-nav">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {SECTIONS.slice(0, 4).map((s) => (
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
          </ul>
        </nav>
      </div>
    </header>
  );
}
