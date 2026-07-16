import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isCommerceProductCategorySlug } from '@/lib/product-url';

const INTERNAL_ORIGIN =
  process.env.NXT_INTERNAL_ORIGIN?.replace(/\/$/, '') ?? 'http://127.0.0.1:3008';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyMatch = pathname.match(/^\/category\/([^/]+)\/([^/]+)\/?$/);
  if (legacyMatch) {
    const [, categorySlug, productSlug] = legacyMatch;
    if (isCommerceProductCategorySlug(categorySlug)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${categorySlug}/${productSlug}`;
      return NextResponse.redirect(url, 308);
    }
  }

  const match = pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const [, categorySlug, productSlug] = match;
  if (!isCommerceProductCategorySlug(categorySlug)) return NextResponse.next();

  const rewriteUrl = new URL(`/products/${productSlug}`, INTERNAL_ORIGIN);
  rewriteUrl.search = request.nextUrl.search;
  const response = NextResponse.rewrite(rewriteUrl);
  response.headers.set('x-product-category-route', '1');
  return response;
}

export const config = {
  matcher: [
    '/category/:category/:productSlug',
    '/smart-phones/:productSlug',
    '/smartwatches/:productSlug',
    '/tablets/:productSlug',
    '/laptops/:productSlug',
    '/smart-light-bulbs/:productSlug',
    '/smart-tvs/:productSlug',
    '/smart-cameras/:productSlug',
    '/smart-speakers/:productSlug',
    '/headphones/:productSlug',
    '/raspberry-pi/:productSlug',
  ],
};
