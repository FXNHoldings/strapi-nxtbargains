import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_LENGTH = 4000;

export async function POST(request: NextRequest) {
  const body = (await request.text()).slice(0, MAX_BODY_LENGTH);

  try {
    const parsed = JSON.parse(body);
    console.error('Client-side error reported:', parsed);
  } catch {
    console.error('Client-side error reported:', body);
  }

  return NextResponse.json({ ok: true });
}
