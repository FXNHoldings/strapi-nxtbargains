'use client';

import { useEffect } from 'react';

export default function StickyHeaderShadow() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-testid="site-header"]');
    if (!header) return;

    const updateStickyState = () => {
      header.dataset.stickyActive = window.scrollY > 0 ? 'true' : 'false';
    };

    updateStickyState();
    window.addEventListener('scroll', updateStickyState, { passive: true });
    return () => window.removeEventListener('scroll', updateStickyState);
  }, []);

  return null;
}
