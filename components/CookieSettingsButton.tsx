'use client';

import { useCookieConsent } from '@/components/CookieConsentProvider';

export default function CookieSettingsButton({ className = '' }: { className?: string }) {
  const { openSettings } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className={className}
      data-testid="cookie-settings-button"
    >
      Cookie settings
    </button>
  );
}
