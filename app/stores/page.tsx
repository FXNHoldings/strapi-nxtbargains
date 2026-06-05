import Link from 'next/link';
import type { Metadata } from 'next';
import { listStores, type Store } from '@/lib/strapi';
import { SITE } from '@/lib/site';
import PageHero from '@/components/PageHero';
import ValueStrip from '@/components/ValueStrip';

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
    <div data-testid="stores-page">
      <PageHero
        eyebrow="Directory"
        title="Stores & Marketplaces"
        sub={`Every store and marketplace we compare prices across${stores.length ? ` — ${stores.length} and counting` : ''}.`}
      >
        {/* alphabet jump-nav */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {ALPHABET.map((l) =>
            groups.has(l) ? (
              <a key={l} href={`#letter-${l}`} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-ink/10 bg-white font-display text-[0.85rem] font-semibold text-ink transition hover:border-primary hover:bg-primary hover:text-white">{l}</a>
            ) : (
              <span key={l} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] font-display text-[0.85rem] font-semibold text-ink/25">{l}</span>
            ),
          )}
        </div>
      </PageHero>

      <section className="mx-auto max-w-[1366px] px-6 pb-[54px] pt-[18px]">
        {stores.length === 0 ? (
          <p className="text-ink/60">No stores yet — they&apos;ll appear here as products are added.</p>
        ) : (
          letters.map((letter) => (
            <div key={letter} id={`letter-${letter}`} className="mt-[30px] scroll-mt-24 first:mt-0">
              <div className="mb-[18px] border-b-2 border-ink/10 pb-2.5 font-display text-[1.3rem] font-extrabold text-primary">{letter}</div>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
                {groups.get(letter)!.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/stores/${s.slug}`}
                    className="flex items-center gap-3.5 rounded-[13px] border border-ink/10 bg-white p-3.5 transition hover:-translate-y-[3px] hover:border-primary hover:shadow-[0_18px_36px_-22px_rgba(13,27,42,0.4)]"
                  >
                    {s.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo} alt={s.name} loading="lazy" referrerPolicy="no-referrer" className="h-[46px] w-[46px] flex-none rounded-[10px] object-contain mix-blend-multiply" />
                    ) : (
                      <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[10px] bg-muted font-display font-bold text-ink/40">{s.name[0]}</span>
                    )}
                    <div className="min-w-0">
                      <h4 className="truncate font-display text-[0.92rem] font-semibold text-ink">{s.name}</h4>
                      <div className="text-[0.78rem] text-ink/55">{s.productCount} product{s.productCount === 1 ? '' : 's'}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <ValueStrip />
    </div>
  );
}
