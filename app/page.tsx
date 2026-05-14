import { SITE } from '@/lib/site';

export const revalidate = 60;

const MERCHANTS = [
  'Amazon',
  'eBay',
  'Argos',
  'Currys',
  'John Lewis',
  'AO',
  'Very',
  'Boots',
];

const TICKER = [
  { name: 'Sony WH-1000XM5', from: '£379', to: '£259', merchant: 'Amazon' },
  { name: 'Dyson V11', from: '£499', to: '£349', merchant: 'Argos' },
  { name: 'AirPods Pro 2', from: '£249', to: '£189', merchant: 'John Lewis' },
  { name: 'Nintendo Switch OLED', from: '£309', to: '£249', merchant: 'Currys' },
  { name: 'Le Creuset 24cm', from: '£275', to: '£165', merchant: 'Amazon' },
];

export default async function HomePage() {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div data-testid="home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Hero />
    </div>
  );
}

function Hero() {
  return (
    <section
      className="relative isolate overflow-hidden bg-paper"
      data-testid="home-hero"
    >
      {/* decorative blurred color anchors */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[560px] w-[560px] rounded-full bg-primary/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 left-[-10%] h-[460px] w-[460px] rounded-full bg-accent/15 blur-3xl"
      />
      {/* fine grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* eyebrow */}
        <p
          className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-primary"
          data-testid="hero-eyebrow"
        >
          <span className="h-px w-10 bg-primary/40" aria-hidden />
          Price tracking · Comparison · Coupons
        </p>

        {/* headline — uses ! prefix to win over the global h1 size rule */}
        <h1 className="mt-7 max-w-5xl !text-[40px] font-extrabold leading-[1.04] tracking-tight text-ink sm:!text-6xl md:!text-7xl lg:!text-[88px]">
          Never pay
          <br className="hidden sm:block" />
          <span className="relative inline-block">
            <span className="relative z-10">full price</span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-[0.12em] -z-0 h-[0.28em] bg-primary/25"
            />
          </span>{' '}
          <span className="text-primary">again.</span>
        </h1>

        {/* subhead */}
        <p className="mt-7 max-w-2xl text-base leading-8 text-ink/65 sm:text-lg md:text-xl">
          Track prices across hundreds of UK merchants, get pinged the moment
          something you want drops, and stack live coupons at checkout. One
          link in &mdash; the savings come to you.
        </p>

        {/* primary CTA: paste-a-link */}
        <form
          className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row"
          action="/search"
          method="get"
          role="search"
          data-testid="hero-track-form"
        >
          <label className="group flex flex-1 items-center gap-3 rounded-2xl border border-ink/15 bg-white px-4 py-3.5 transition focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(21,86,238,0.12)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 shrink-0 text-ink/40 transition group-focus-within:text-primary"
              aria-hidden
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <input
              type="search"
              name="q"
              placeholder="Paste a product link or search a name…"
              autoComplete="off"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none sm:text-base"
              aria-label="Product URL or name"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-7 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis active:bg-primary-pressed"
          >
            Track price
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-2 h-4 w-4"
              aria-hidden
            >
              <path d="M5 12h14" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
        </form>

        {/* tertiary helper */}
        <p className="mt-3 text-xs text-ink/45">
          Free, no signup needed. Works with any product page on a supported
          merchant.
        </p>

        {/* stat row */}
        <dl
          className="mt-14 grid max-w-3xl gap-x-8 gap-y-6 border-t border-ink/10 pt-8 sm:grid-cols-3"
          data-testid="hero-stats"
        >
          <Stat number="240+" label="Merchants tracked" />
          <Stat number="2.1M" label="Live price points" />
          <Stat number="£3.4M" label="Saved by users in '26" />
        </dl>

        {/* merchant row */}
        <div
          className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-3 text-[11px] font-bold uppercase tracking-[0.22em] text-ink/40"
          data-testid="hero-merchants"
        >
          <span className="text-ink/55">Following prices on</span>
          {MERCHANTS.map((m) => (
            <span
              key={m}
              className="rounded-full border border-ink/12 bg-white px-3 py-1.5 text-ink/70"
            >
              {m}
            </span>
          ))}
          <span className="rounded-full bg-ink px-3 py-1.5 text-white">
            +200 more
          </span>
        </div>
      </div>

      {/* live ticker */}
      <div
        className="relative border-t border-ink/10 bg-white"
        data-testid="hero-ticker"
        aria-label="Recent price drops"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-hidden px-6 py-3">
          <span className="hidden shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink/55 sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Live drops
          </span>
          <ul className="flex min-w-0 flex-1 items-center gap-8 overflow-hidden text-sm text-ink/75">
            {TICKER.map((t) => {
              const drop = parseInt(t.from.replace(/[^0-9]/g, ''), 10);
              const now = parseInt(t.to.replace(/[^0-9]/g, ''), 10);
              const pct = Math.round(((drop - now) / drop) * 100);
              return (
                <li
                  key={t.name}
                  className="flex shrink-0 items-center gap-2 whitespace-nowrap"
                >
                  <span className="font-semibold text-ink">{t.name}</span>
                  <span className="text-ink/40 line-through">{t.from}</span>
                  <span className="font-bold text-primary">{t.to}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                      aria-hidden
                    >
                      <path d="M7 13l5 5 5-5" />
                      <path d="M12 18V6" />
                    </svg>
                    {pct}%
                  </span>
                  <span className="text-xs uppercase tracking-wider text-ink/35">
                    {t.merchant}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <dt className="font-display !text-2xl font-extrabold tracking-tight text-ink sm:!text-3xl">
        {number}
      </dt>
      <dd className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
        {label}
      </dd>
    </div>
  );
}
