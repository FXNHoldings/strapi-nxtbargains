'use client';

import { useState } from 'react';

type Status = 'idle' | 'submitting' | 'ok' | 'error';

export default function CommentForm({ postDocumentId }: { postDocumentId: string }) {
  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('');

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postDocumentId, authorName, email, body, website }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus('ok');
        setMessage(data.message || 'Thanks for your comment. It will appear once approved.');
        setAuthorName('');
        setEmail('');
        setBody('');
        setWebsite('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Could not save your comment. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not save your comment. Please try again.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 border border-ink/10 bg-paper p-5 sm:p-6" data-testid="comment-form">
      <h4 className="font-display text-lg font-bold text-ink">Leave a comment</h4>

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
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Join the conversation"
        rows={5}
        minLength={5}
        maxLength={4000}
        className="mt-3 w-full border border-ink/15 bg-white px-3 py-2 text-sm leading-6 text-ink placeholder:text-ink/35"
      />

      {message && (
        <p
          className={`mt-3 text-sm ${status === 'ok' ? 'text-emerald-700' : 'text-[#ff2447]'}`}
          data-testid={status === 'ok' ? 'comment-success' : 'comment-error'}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || !postDocumentId}
        className="mt-4 inline-flex bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-primary-emphasis disabled:opacity-60"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit comment'}
      </button>
      <p className="mt-3 text-xs text-ink/40">Comments are checked before they appear.</p>
    </form>
  );
}
