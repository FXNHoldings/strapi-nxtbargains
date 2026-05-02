import Link from 'next/link';
import { SITE, SECTIONS } from '@/lib/site';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-ink/10 bg-white" data-testid="site-footer">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-display text-2xl font-extrabold tracking-tight text-ink">
            <span className="text-primary">NXT</span>.<span className="text-ink">Bargains</span>
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-ink/70">{SITE.tagline}</p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60">Browse</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.slug}>
                <Link href={`/${s.slug}`} className="text-ink/80 transition hover:text-primary">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60">About</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-ink/80 transition hover:text-primary">
                About {SITE.name}
              </Link>
            </li>
            <li>
              <Link href="/feed.xml" className="text-ink/80 transition hover:text-primary">
                RSS feed
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 px-6 py-5 text-xs text-ink/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {SITE.name}. As an Amazon Associate we earn from qualifying purchases.</p>
          <p>Prices and availability are accurate as of the date displayed and subject to change.</p>
        </div>
      </div>
    </footer>
  );
}
