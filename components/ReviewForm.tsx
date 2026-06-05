'use client';

import { useState } from 'react';

type Status = 'idle' | 'submitting' | 'ok' | 'error';

export default function ReviewForm({ productDocumentId }: { productDocumentId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    if (rating < 1) { setStatus('error'); setMessage('Please choose a star rating.'); return; }
    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDocumentId, rating, authorName, email, title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('ok');
        setMessage(data.message || 'Thanks for your review!');
        setRating(0); setAuthorName(''); setEmail(''); setTitle(''); setBody('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Could not save your review. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not save your review. Please try again.');
    }
  }

  if (status === 'ok') {
    return (
      <div className="border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800" data-testid="review-success">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-ink/10 bg-paper p-5 sm:p-6" data-testid="review-form">
      <h3 className="font-display text-lg font-bold text-ink">Write a review</h3>

      <div className="mt-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/45">Your rating</label>
        <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-checked={rating === n}
              role="radio"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className={`text-2xl leading-none transition ${(hover || rating) >= n ? 'text-amber-400' : 'text-ink/20 hover:text-amber-300'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          required
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name"
          maxLength={80}
          className="border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional, not published)"
          maxLength={180}
          className="border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35"
        />
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Review title (optional)"
        maxLength={120}
        className="mt-3 w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35"
      />

      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think of this product?"
        rows={4}
        maxLength={4000}
        className="mt-3 w-full border border-ink/15 bg-white px-3 py-2 text-sm leading-6 text-ink placeholder:text-ink/35"
      />

      {status === 'error' && message && (
        <p className="mt-3 text-sm text-[#ff2447]" data-testid="review-error">{message}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-4 inline-flex bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis disabled:opacity-60"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit review'}
      </button>
      <p className="mt-3 text-xs text-ink/40">Reviews are checked before they appear.</p>
    </form>
  );
}
