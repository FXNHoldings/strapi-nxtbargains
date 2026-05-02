import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: `About ${SITE.name} — ${SITE.tagline}`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16" data-testid="about-page">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">About</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        {SITE.name}
      </h1>

      <div className="prose prose-slate mt-8 max-w-none">
        <p className="lead">
          {SITE.tagline}
        </p>
        <p>
          {SITE.name} is a small editorial site focused on helping you choose the right gadget
          without slogging through twenty browser tabs. We compare products side-by-side,
          publish hands-on reviews, round up the best of each category, and answer the
          questions you’d actually ask before buying.
        </p>
        <h2>How we make money</h2>
        <p>
          Most of the “Buy now” buttons you’ll see lead to Amazon. When you click through and
          buy, we earn a small commission — at no extra cost to you. As an Amazon Associate
          we earn from qualifying purchases.
        </p>
        <h2>How we choose what to cover</h2>
        <p>
          We pick comparisons and roundups based on the products people are actually shopping
          for, then write what we’d want to read ourselves: short on fluff, heavy on the
          numbers, and clear about trade-offs.
        </p>
      </div>
    </article>
  );
}
