import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import PageHero from '@/components/PageHero';
import ValueStrip from '@/components/ValueStrip';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with the ${SITE.name} editorial team — story tips, partnership questions, corrections.`,
  alternates: { canonical: '/contact' },
};

const channels = [
  { ic: '✉', t: 'Tips & partnerships', s: 'hello@nxt.bargains' },
  { ic: '𝕏', t: 'On X', s: '@nxtbargains' },
  { ic: 'f', t: 'On Facebook', s: '/nxtbargains' },
];

const quickLinks: [string, string][] = [
  ['/', 'Home'],
  ['/sitemap', 'Site map'],
  ['/about', 'About us'],
];

export default function ContactPage() {
  return (
    <div data-testid="contact-page">
      <PageHero
        eyebrow="Contact"
        title="Get in touch."
        sub="Story tips, partnership questions, corrections, or just hello — we read everything that comes through. Pick the channel that fits."
      />

      <section className="mx-auto max-w-[1366px] px-6 py-[54px]">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_0.9fr]">
          {/* form card */}
          <div className="rounded-[20px] border border-ink/10 bg-white p-6 shadow-[0_30px_70px_-42px_rgba(13,27,42,0.4)] sm:p-[34px]" data-testid="contact-form-card">
            <span className="text-[0.74rem] font-bold uppercase tracking-[0.16em] text-primary">Send a message</span>
            <h2 className="mb-1.5 mt-1.5 font-display font-bold text-ink">Tell us what&apos;s on your mind.</h2>
            <p className="mb-[22px] text-[0.9rem] leading-[1.55] text-ink/55">
              Fill in the form and we&apos;ll get back to you. Submitting opens your default email client with the
              message pre-filled — no data is sent to a server. Prefer email?{' '}
              <a href="mailto:hello@nxt.bargains" className="font-semibold text-primary hover:underline">hello@nxt.bargains</a>
            </p>
            <ContactForm />
          </div>

          {/* side */}
          <div>
            <div className="mb-4 rounded-2xl border border-ink/10 bg-white p-6">
              <h3 className="mb-2 font-display font-semibold text-ink">Other ways to reach us</h3>
              <p className="mb-3.5 text-[0.9rem] leading-[1.55] text-ink/55">Choose whichever suits — we keep an eye on all of them.</p>
              {channels.map((c, i) => (
                <div key={c.t} className={`flex items-center gap-3.5 py-3 ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-primary/10 font-display text-primary" aria-hidden>{c.ic}</span>
                  <div>
                    <div className="font-display text-[0.92rem] font-semibold text-ink">{c.t}</div>
                    <div className="text-[0.82rem] text-ink/55">{c.s}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-6">
              <h3 className="mb-2 font-display font-semibold text-ink">Looking for something specific?</h3>
              <p className="mb-3.5 text-[0.9rem] leading-[1.55] text-ink/55">Browse the full archive or jump to a section.</p>
              <div className="flex flex-wrap gap-2.5">
                {quickLinks.map(([href, label]) => (
                  <Link key={href} href={href} className="rounded-[9px] border border-ink/10 bg-muted px-[15px] py-2.5 text-[0.85rem] font-semibold text-ink transition hover:border-primary hover:text-primary">{label}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ValueStrip />
    </div>
  );
}
