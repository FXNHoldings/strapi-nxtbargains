import { NextResponse } from 'next/server';

const BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
// Writes need a token with create permission on commerce-review.
const WRITE_TOKEN = process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_API_TOKEN || '';

type ReviewPayload = {
  authorName?: string;
  email?: string;
  rating?: number | string;
  title?: string;
  body?: string;
  productDocumentId?: string;
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(request: Request) {
  let payload: ReviewPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: 'Please submit the form again.' }, { status: 400 });
  }

  const authorName = typeof payload.authorName === 'string' ? payload.authorName.trim().slice(0, 80) : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase().slice(0, 180) : '';
  const rating = Number(payload.rating);
  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 120) : '';
  const body = typeof payload.body === 'string' ? payload.body.trim().slice(0, 4000) : '';
  const productDocumentId = typeof payload.productDocumentId === 'string' ? payload.productDocumentId.trim() : '';

  if (!authorName) {
    return NextResponse.json({ message: 'Please enter your name.' }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ message: 'Please choose a rating from 1 to 5 stars.' }, { status: 400 });
  }
  if (body.length < 5) {
    return NextResponse.json({ message: 'Please write a little more in your review.' }, { status: 400 });
  }
  if (!productDocumentId) {
    return NextResponse.json({ message: 'Missing product reference.' }, { status: 400 });
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!WRITE_TOKEN) {
    return NextResponse.json({ message: 'Reviews are not configured yet.' }, { status: 500 });
  }

  try {
    const res = await fetch(`${BASE}/api/commerce-reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WRITE_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          authorName,
          ...(email ? { email } : {}),
          rating,
          ...(title ? { title } : {}),
          body,
          product: productDocumentId,
          reviewStatus: 'pending',
          source: 'nxt.bargains',
        },
      }),
    });

    if (!res.ok) {
      console.error('Review create failed:', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ message: 'Could not save your review. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ message: 'Thanks for your review! It will appear here once approved.' });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ message: 'Could not save your review. Please try again.' }, { status: 500 });
  }
}
