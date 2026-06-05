'use client';

import { useState } from 'react';
import ProductCarousel from './ProductCarousel';
import BestSellerCard, { type BestSeller, type Marketplace, MARKETPLACE_LABEL } from './BestSellerCard';

type Group = { key: Marketplace; items: BestSeller[] };

export default function MarketplaceBestSellers({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState<Marketplace>(groups[0]?.key ?? 'amazon');
  if (!groups.length) return null;
  const current = groups.find((g) => g.key === active) ?? groups[0];

  return (
    <div>
      <div className="mb-6 inline-flex rounded bg-[#e9ebf1] p-1" role="tablist" aria-label="Marketplace">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={active === g.key}
            onClick={() => setActive(g.key)}
            className={`rounded px-6 py-2.5 text-sm font-semibold transition ${
              active === g.key
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink/50 hover:text-ink'
            }`}
          >
            {MARKETPLACE_LABEL[g.key]}
          </button>
        ))}
      </div>

      <ProductCarousel
        key={active}
        items={(current?.items ?? []).map((b) => (
          <BestSellerCard key={`${b.marketplace}-${b.asin || b.id || b.rank}`} item={b} />
        ))}
      />
    </div>
  );
}
