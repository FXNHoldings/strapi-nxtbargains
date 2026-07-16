import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/category\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const [, , productSlug] = match;
  const url = request.nextUrl.clone();
  url.pathname = `/products/${productSlug}`;
  const response = NextResponse.rewrite(url);
  response.headers.set('x-product-category-route', '1');
  return response;
}

export const config = {
  matcher: ['/category/:category/:productSlug'],
};
