export default function CouponLottie() {
  return (
    <aside className="overflow-hidden border border-ink/10 bg-muted p-6">
      <div
        className="mx-auto grid aspect-square w-full max-w-[360px] place-items-center"
        aria-label="Animated coupons and savings graphic"
        role="img"
      >
        <svg
          viewBox="0 0 420 420"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <style>
            {`
              .coupon-halo { animation: couponPulse 2.8s ease-in-out infinite; transform-origin: 210px 210px; }
              .coupon-ticket { animation: couponFloat 3.6s ease-in-out infinite; transform-origin: 210px 210px; }
              .coupon-coin { animation: couponSpin 3.8s linear infinite; transform-origin: 318px 116px; }
              .coupon-tag { animation: couponPop 2.4s ease-in-out infinite; transform-origin: 290px 292px; }
              @keyframes couponPulse {
                0%, 100% { opacity: .12; transform: scale(.9); }
                50% { opacity: .26; transform: scale(1.08); }
              }
              @keyframes couponFloat {
                0%, 100% { transform: translateY(8px) rotate(-5deg); }
                50% { transform: translateY(-10px) rotate(4deg); }
              }
              @keyframes couponSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes couponPop {
                0%, 100% { transform: scale(.96); }
                50% { transform: scale(1.06); }
              }
            `}
          </style>
          <circle className="coupon-halo" cx="210" cy="210" r="150" fill="#1556ee" />
          <g className="coupon-ticket">
            <path
              d="M91 155c0-14.4 11.6-26 26-26h186c14.4 0 26 11.6 26 26v30c-14.4 0-26 11.6-26 26s11.6 26 26 26v30c0 14.4-11.6 26-26 26H117c-14.4 0-26-11.6-26-26v-30c14.4 0 26-11.6 26-26s-11.6-26-26-26v-30z"
              fill="#fff"
              stroke="#1556ee"
              strokeWidth="8"
            />
            <path d="M158 176h104" stroke="#0F172A" strokeWidth="12" strokeLinecap="round" />
            <path d="M154 244h112" stroke="#CBD5E1" strokeWidth="10" strokeLinecap="round" />
            <text
              x="210"
              y="226"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize="56"
              fontWeight="800"
              fill="#0F172A"
            >
              50%
            </text>
          </g>
          <g className="coupon-coin">
            <circle cx="318" cy="116" r="34" fill="#F59E0B" />
            <circle cx="318" cy="116" r="22" fill="none" stroke="#fff" strokeWidth="5" opacity=".75" />
            <path d="M318 99v34M306 116h24" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          </g>
          <g className="coupon-tag">
            <path d="M254 280h82l24 24-24 24h-82l-24-24 24-24z" fill="#1556ee" />
            <text
              x="295"
              y="312"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize="24"
              fontWeight="800"
              fill="#fff"
            >
              DEAL
            </text>
          </g>
        </svg>
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
