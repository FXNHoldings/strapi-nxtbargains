export const SITE = {
  name: 'NXT.Bargains',
  tagline: 'Side-by-side product comparisons, honest reviews, smart deals.',
  description:
    'Side-by-side product comparisons, honest reviews, roundups and how-to guides — pick the right gadget without the wading.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxtbargains.fxnstudio.com').replace(/\/$/, ''),
  amazonAffiliateTag: process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || '',
  social: {
    facebook: 'https://www.facebook.com/nxtbargains',
    twitter: 'https://x.com/nxtbargains',
  },
};

export const INFORMATIVE_ARTICLES_SLUG = 'nxt-bargains-informative-articles' as const;

export type SectionKey =
  | 'product-comparisons'
  | 'product-reviews'
  | 'product-roundups'
  | 'how-to-guides'
  | 'top-rated-smart-electronics-devices'
  | 'nxt-bargains-informative-articles';

export type Section = {
  slug: SectionKey;
  title: string;
  short: string;
  blurb: string;
};

// Default sections shown on the homepage. These mirror the source WP categories,
// so URLs stay 1:1 with the migrated content (good for SEO continuity).
export const SECTIONS: Section[] = [
  {
    slug: 'product-comparisons',
    title: 'Product Comparisons',
    short: 'Comparisons',
    blurb: 'Side-by-side breakdowns so you can pick the right one in minutes.',
  },
  {
    slug: 'product-reviews',
    title: 'Product Reviews',
    short: 'Product Reviews',
    blurb: 'Hands-on takes — what works, what doesn’t, what’s worth the money.',
  },
  {
    slug: 'product-roundups',
    title: 'Product Roundups',
    short: 'Product Roundups',
    blurb: 'Best-of lists for the categories you’re actually shopping in.',
  },
  {
    slug: 'how-to-guides',
    title: 'How-to Guides',
    short: 'How-to',
    blurb: 'Step-by-step walkthroughs for setup, troubleshooting, and getting more from your gear.',
  },
  {
    slug: 'top-rated-smart-electronics-devices',
    title: 'Top-Rated Products',
    short: 'Top Rated',
    blurb: 'The standouts — highest-scoring picks across categories.',
  },
  {
    slug: 'nxt-bargains-informative-articles',
    title: 'Informative Articles',
    short: 'Explainers',
    blurb: 'Background reading — trends, primers and the state of the gadget world.',
  },
];

export const BLOG_NAV_LINKS = [
  ...SECTIONS.slice(0, 3).map((section) => ({
    href: `/${section.slug}`,
    label: section.title,
  })),
  { href: '/buying-guides', label: 'Buying Guides' },
  ...SECTIONS.slice(3).map((section) => ({
    href: `/${section.slug}`,
    label: section.title,
  })),
  { href: '/smart-home', label: 'Smart Home' },
  { href: '/deal-alerts', label: 'Deal Alerts' },
];

/** Footer “All Articles” column — key links pinned to the top. */
export const FOOTER_ARTICLE_NAV_LINKS = [
  { href: '/top-rated-smart-electronics-devices', label: 'Top-Rated Products' },
  { href: '/deal-alerts', label: 'Deal Alerts' },
  { href: '/smart-home', label: 'Smart Home' },
  { href: '/buying-guides', label: 'Buying Guides' },
  ...BLOG_NAV_LINKS.filter(
    (link) =>
      link.href !== '/deal-alerts' &&
      link.href !== '/smart-home' &&
      link.href !== '/buying-guides' &&
      link.href !== '/top-rated-smart-electronics-devices' &&
      link.href !== '/product-reviews',
  ).map((link) =>
    link.href === '/nxt-bargains-informative-articles' ? { ...link, label: 'Informative' } : link,
  ),
  { href: '/product-reviews', label: 'Product Reviews' },
];
