import Link from 'next/link';
import type { Metadata } from 'next';
import { listStores, type Store } from '@/lib/strapi';
import { SITE } from '@/lib/site';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Stores & Marketplaces',
  description: `Browse every store and marketplace we compare prices across on ${SITE.name}.`,
  alternates: { canonical: '/stores' },
};

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function letterOf(name: string) {
  const c = (name[0] || '#').toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export default async function StoresPage() {
  const stores = await listStores().catch(() => [] as Store[]);

  const groups = new Map<string, Store[]>();
  for (const s of stores) {
    const l = letterOf(s.name);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(s);
  }
  const letters = ALPHABET.filter((l) => groups.has(l));

  return (
    <main className="bg-white" data-testid="stores-page">
      <section className="border-b border-ink/10 bg-paper">
        <div className="mx-auto max-w-[1420px] px-4 py-12 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Directory</p>
          <h1 className="mt-2 font-display !text-[36px] font-bold leading-[1.05] text-ink sm:!text-[52px] lg:!text-[70px]">Stores &amp; Marketplaces</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/60 sm:text-base">
            Every store and marketplace we compare prices across{stores.length ? ` — ${stores.length} and counting` : ''}.
          </p>
        </div>
      </section>

      {/* alphabet jump-nav */}
      <div className="sticky top-16 z-30 border-b border-ink/10 bg-white/90 backdrop-blur sm:top-[72px]">
        <div className="mx-auto flex max-w-[1420px] flex-wrap gap-1 px-4 py-3 sm:px-6">
          {ALPHABET.map((l) =>
            groups.has(l) ? (
              <a key={l} href={`#letter-${l}`} className="flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-ink transition hover:bg-primary hover:text-white">{l}</a>
            ) : (
              <span key={l} className="flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-ink/20">{l}</span>
            ),
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1420px] px-4 py-10 sm:px-6">
        {stores.length === 0 ? (
          <p className="text-ink/60">No stores yet — they'll appear here as products are added.</p>
        ) : (
          letters.map((letter) => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-32 border-t border-ink/10 py-8 first:border-t-0 first:pt-0">
              <h2 className="font-display text-2xl font-bold text-primary">{letter}</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {groups.get(letter)!.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/stores/${s.slug}`}
                    className="group flex items-center gap-3 border border-ink/10 bg-white p-4 transition hover:border-primary hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
                  >
                    {s.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo} alt={s.name} loading="lazy" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded object-contain" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted font-display text-sm font-bold text-ink/40">{s.name[0]}</span>
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-1 block font-display text-sm font-bold text-ink transition group-hover:text-primary">{s.name}</span>
                      <span className="text-xs text-ink/45">{s.productCount} product{s.productCount === 1 ? '' : 's'}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
