'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Script from 'next/script';

export type StoreFilterItem = {
  key: string;
  card: ReactNode; // server-rendered CommerceProductCard
  name: string;
  categories: string[];
  brand: string | null;
  price: number | null;
};

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name';
const unique = (a: string[]) => [...new Set(a)];

export default function StoreFilter({ items }: { items: StoreFilterItem[] }) {
  const allCategories = useMemo(() => unique(items.flatMap((i) => i.categories)).sort((a, b) => a.localeCompare(b)), [items]);
  const allBrands = useMemo(() => unique(items.map((i) => i.brand).filter((b): b is string => Boolean(b))).sort((a, b) => a.localeCompare(b)), [items]);
  const prices = items.map((i) => i.price).filter((p): p is number => p != null);
  const priceMin = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const priceMax = prices.length ? Math.ceil(Math.max(...prices)) : 0;

  const [cats, setCats] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [maxPrice, setMaxPrice] = useState(priceMax);
  const [sort, setSort] = useState<Sort>('featured');

  const dirty = cats.size > 0 || brands.size > 0 || maxPrice < priceMax;
  const clear = () => { setCats(new Set()); setBrands(new Set()); setMaxPrice(priceMax); };
  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setSet(next);
  };

  const filtered = useMemo(() => {
    let list = items.filter((i) =>
      (cats.size === 0 || i.categories.some((c) => cats.has(c))) &&
      (brands.size === 0 || (i.brand != null && brands.has(i.brand))) &&
      (i.price == null || maxPrice >= priceMax || i.price <= maxPrice),
    );
    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    else if (sort === 'price-desc') list = [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [items, cats, brands, maxPrice, sort, priceMax]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_3fr]">
      {/* Left column — filters */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-ink/10 bg-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">Filters</h2>
            {dirty && (
              <button type="button" onClick={clear} className="text-xs font-bold text-primary hover:underline">Clear all</button>
            )}
          </div>

          <label className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-ink/45">Sort by</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="mt-1.5 w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name: A–Z</option>
          </select>

          {priceMax > priceMin && (
            <div className="mt-5 border-t border-ink/10 pt-5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/45">
                <span>Max price</span>
                <span className="text-ink">${maxPrice}</span>
              </div>
              <input
                type="range"
                min={priceMin}
                max={priceMax}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-2.5 w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-[11px] text-ink/40"><span>${priceMin}</span><span>${priceMax}</span></div>
            </div>
          )}

          {allCategories.length > 1 && (
            <FacetGroup title="Category" options={allCategories} selected={cats} onToggle={(v) => toggle(cats, setCats, v)} />
          )}
          {allBrands.length > 1 && (
            <FacetGroup title="Brand" options={allBrands} selected={brands} onToggle={(v) => toggle(brands, setBrands, v)} />
          )}
        </div>

        {/* Impact impression tracker (ad slot) */}
        <Script
          id="impact-impression-tracker"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('https://utt.impactcdn.com/P-A7359408-6e63-4fbe-bd6f-1133c90d4adb1.js','script','impactStat',document,window);impactStat('trackImpression');",
          }}
        />
      </aside>

      {/* Right column — filtered products */}
      <div>
        <p className="mb-4 text-sm text-ink/55">
          {filtered.length} product{filtered.length === 1 ? '' : 's'}{dirty ? ` of ${items.length}` : ''}
        </p>
        {filtered.length === 0 ? (
          <p className="border border-ink/10 bg-paper p-6 text-sm text-ink/60">No products match your filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-3">
            {filtered.map((i) => <div key={i.key}>{i.card}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mt-5 border-t border-ink/10 pt-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{title}</p>
      <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 text-sm text-ink/70 hover:text-ink">
            <input type="checkbox" checked={selected.has(o)} onChange={() => onToggle(o)} className="accent-primary" />
            <span className="line-clamp-1">{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
