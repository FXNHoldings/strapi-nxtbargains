export const SITE = {
  name: 'NXT.Bargains',
  tagline: 'Side-by-side product comparisons, honest reviews, smart deals.',
  description:
    'Side-by-side product comparisons, honest reviews, roundups and how-to guides — pick the right gadget without the wading.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxtbargains.fxnstudio.com').replace(/\/$/, ''),
  twitter: '',
  amazonAffiliateTag: process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || '',
};

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
