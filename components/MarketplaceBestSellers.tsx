'use client';

import { useState } from 'react';
import { type BestSeller, type Marketplace, MARKETPLACE_LABEL } from './BestSellerCard';

type Group = { key: Marketplace; items: BestSeller[] };

export default function MarketplaceBestSellers({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState<Marketplace>(groups[0]?.key ?? 'amazon');
  if (!groups.length) return null;
  const current = groups.find((g) => g.key === active) ?? groups[0];

  return (
    <div>
      {/* tabs */}
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Marketplace">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={active === g.key}
            onClick={() => setActive(g.key)}
            className={`rounded-full border px-[18px] py-[9px] font-display text-[0.88rem] font-semibold transition ${
              active === g.key
                ? 'border-ink bg-ink text-white'
                : 'border-ink/10 bg-white text-ink/55 hover:border-primary hover:text-primary'
            }`}
          >
            {MARKETPLACE_LABEL[g.key]}
          </button>
        ))}
      </div>

      {/* ranked list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(current?.items ?? []).slice(0, 10).map((it, i) => (
          <a
            key={`${it.marketplace}-${it.asin || it.id || i}`}
            href={it.url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group flex items-center gap-3.5 rounded-[13px] border border-ink/10 bg-white p-3 transition hover:translate-x-[3px] hover:border-primary"
          >
            <span className="w-[30px] shrink-0 font-display text-[1.05rem] font-extrabold text-primary">{i + 1}</span>
            {it.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-[46px] w-[46px] shrink-0 rounded-[9px] object-contain mix-blend-multiply" />
            ) : (
              <span className="h-[46px] w-[46px] shrink-0 rounded-[9px] bg-muted" />
            )}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 block text-[0.85rem] text-ink transition group-hover:text-primary">{it.title}</span>
              <span className="mt-0.5 block text-[0.76rem] text-ink/55">
                {it.rating ? <span className="font-semibold text-primary">★ {it.rating}</span> : null}
                {it.rating ? ' · ' : ''}
                {MARKETPLACE_LABEL[it.marketplace ?? active]}
              </span>
            </span>
            <span className="shrink-0 font-display text-[0.95rem] font-bold text-ink">{it.price ?? ''}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
