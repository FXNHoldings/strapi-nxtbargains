const items = [
  { ic: '✓', t: 'Compare every marketplace', s: 'One product, side-by-side prices from Amazon, eBay & more.' },
  { ic: '📈', t: 'Price history & drops', s: "See an item's lowest price and buy at the right moment." },
  { ic: '⚡', t: 'Free, no signup', s: 'Just search a product and start saving — nothing to install.' },
];

export default function ValueStrip() {
  return (
    <div className="mt-[30px] border-t border-ink/10 bg-muted">
      <div className="mx-auto grid max-w-[1366px] gap-[22px] px-6 py-10 sm:grid-cols-3">
        {items.map((v) => (
          <div key={v.t} className="flex items-center gap-3.5">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary/10 text-primary">{v.ic}</span>
            <div>
              <div className="font-display text-[0.96rem] font-semibold text-ink">{v.t}</div>
              <div className="text-[0.85rem] text-ink/55">{v.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
