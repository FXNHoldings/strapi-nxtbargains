'use client';

import { useEffect } from 'react';

const MAX_DETAIL_LENGTH = 4000;
const CHUNK_RELOAD_WINDOW_MS = 5 * 60 * 1000;

function isChunkLoadError(message?: string, source?: string) {
  const text = `${message ?? ''} ${source ?? ''}`;
  return /ChunkLoadError|Loading chunk \d+ failed|\/_next\/static\/chunks\//i.test(text);
}

function recoverFromChunkLoadError() {
  const key = `nxt-bargains:chunk-reload:${window.location.pathname}`;
  const previous = Number(window.sessionStorage.getItem(key) ?? 0);
  const now = Date.now();

  if (Number.isFinite(previous) && now - previous < CHUNK_RELOAD_WINDOW_MS) {
    return false;
  }

  window.sessionStorage.setItem(key, String(now));
  window.location.reload();
  return true;
}

function normalizeReason(reason: unknown) {
  if (reason instanceof Error) {
    return {
      message: reason.message,
      stack: reason.stack,
    };
  }

  if (typeof reason === 'string') {
    return { message: reason };
  }

  return {
    message: (() => {
      try {
        return JSON.stringify(reason);
      } catch {
        return String(reason);
      }
    })(),
  };
}

function reportClientError(payload: Record<string, unknown>) {
  const body = JSON.stringify({
    ...payload,
    url: window.location.href,
    userAgent: window.navigator.userAgent,
  }).slice(0, MAX_DETAIL_LENGTH);

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch('/api/client-error', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.message, event.filename) && recoverFromChunkLoadError()) {
        event.preventDefault();
        return;
      }

      reportClientError({
        type: 'error',
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportClientError({
        type: 'unhandledrejection',
        ...normalizeReason(event.reason),
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
