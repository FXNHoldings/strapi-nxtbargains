import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GeniuslinkScripts from '@/components/GeniuslinkScripts';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: `${SITE.name} RSS` }],
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col font-sans font-normal" data-testid="app-shell">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <GeniuslinkScripts />
      </body>
    </html>
  );
}
