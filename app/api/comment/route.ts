import { NextResponse } from 'next/server';

const BASE = (process.env.STRAPI_INTERNAL_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const WRITE_TOKEN = process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_API_TOKEN || '';

type CommentPayload = {
  authorName?: string;
  email?: string;
  body?: string;
  postDocumentId?: string;
  website?: string;
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(request: Request) {
  let payload: CommentPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: 'Please submit the form again.' }, { status: 400 });
  }

  if (typeof payload.website === 'string' && payload.website.trim()) {
    return NextResponse.json({ message: 'Thanks for your comment. It will appear once approved.' });
  }

  const authorName = typeof payload.authorName === 'string' ? payload.authorName.trim().slice(0, 80) : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase().slice(0, 180) : '';
  const body = typeof payload.body === 'string' ? payload.body.trim().slice(0, 4000) : '';
  const postDocumentId = typeof payload.postDocumentId === 'string' ? payload.postDocumentId.trim() : '';
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) || '';

  if (!authorName) {
    return NextResponse.json({ message: 'Please enter your name.' }, { status: 400 });
  }
  if (body.length < 5) {
    return NextResponse.json({ message: 'Please write a little more in your comment.' }, { status: 400 });
  }
  if (!postDocumentId) {
    return NextResponse.json({ message: 'Missing post reference.' }, { status: 400 });
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!WRITE_TOKEN) {
    return NextResponse.json({ message: 'Comments are not configured yet.' }, { status: 500 });
  }

  try {
    const res = await fetch(`${BASE}/api/nxt-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WRITE_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          authorName,
          ...(email ? { email } : {}),
          body,
          post: postDocumentId,
          commentStatus: 'pending',
          source: 'nxt.bargains',
          ...(userAgent ? { userAgent } : {}),
        },
      }),
    });

    if (!res.ok) {
      console.error('Comment create failed:', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ message: 'Could not save your comment. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ message: 'Thanks for your comment. It will appear once approved.' });
  } catch (error) {
    console.error('Comment error:', error);
    return NextResponse.json({ message: 'Could not save your comment. Please try again.' }, { status: 500 });
  }
}
