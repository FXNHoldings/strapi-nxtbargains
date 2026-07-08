'use client';

import { useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';
import animationData from '@/data/promo_code.json';

export default function CouponLottie() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const animation: AnimationItem = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    });

    return () => {
      animation.destroy();
    };
  }, []);

  return (
    <aside className="overflow-hidden border border-ink/10 bg-muted p-6">
      <div
        className="mx-auto grid aspect-square w-full max-w-[360px] place-items-center"
        aria-label="Animated promo code graphic"
        role="img"
      >
        <div ref={containerRef} className="h-full w-full" aria-hidden />
      </div>
      <div className="mt-4 border-t border-ink/10 pt-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Live savings</p>
        <p className="mt-2 font-display text-xl font-bold text-ink">Coupons refreshed daily</p>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Browse current promo codes, store discounts, and Amazon coupon offers from the live feeds.
        </p>
      </div>
    </aside>
  );
}
