'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ACCEPT_ALL_CATEGORIES,
  COOKIE_CONSENT_EVENT,
  createConsentRecord,
  DEFAULT_DENIED_CATEGORIES,
  readStoredConsent,
  type CookieConsentCategories,
  type CookieConsentRecord,
  writeStoredConsent,
} from '@/lib/cookie-consent';
import { SITE } from '@/lib/site';

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  ready: boolean;
  bannerOpen: boolean;
  settingsOpen: boolean;
  draft: CookieConsentCategories;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  openSettings: () => void;
  closeBanner: () => void;
  setDraftCategory: (key: keyof CookieConsentCategories, value: boolean) => void;
  saveSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

const CATEGORY_COPY: Array<{
  key: keyof CookieConsentCategories;
  title: string;
  description: string;
}> = [
  {
    key: 'functional',
    title: 'Functional / preferences',
    description: 'Remember choices such as region, language, or recently viewed items.',
  },
  {
    key: 'analytics',
    title: 'Performance / analytics',
    description: 'Help us understand how the site is used so we can improve content and navigation.',
  },
  {
    key: 'advertising',
    title: 'Advertising / targeting',
    description: 'Show relevant ads and measure ad performance on and off the site.',
  },
  {
    key: 'affiliate',
    title: 'Affiliate tracking',
    description: 'Enable affiliate link tools that attribute purchases to partner merchants.',
  },
];

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<CookieConsentCategories>(DEFAULT_DENIED_CATEGORIES);

  const persist = useCallback((categories: CookieConsentCategories) => {
    const record = createConsentRecord(categories);
    writeStoredConsent(record);
    setConsent(record);
    setDraft(record.categories);
    setBannerOpen(false);
    setSettingsOpen(false);
  }, []);

  useEffect(() => {
    const stored = readStoredConsent();
    setConsent(stored);
    setDraft(stored?.categories ?? DEFAULT_DENIED_CATEGORIES);
    setBannerOpen(!stored);
    setReady(true);
  }, []);

  useEffect(() => {
    const onConsentChange = (event: Event) => {
      const record = (event as CustomEvent<CookieConsentRecord>).detail;
      setConsent(record);
      setDraft(record.categories);
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      ready,
      bannerOpen,
      settingsOpen,
      draft,
      acceptAll: () => persist(ACCEPT_ALL_CATEGORIES),
      rejectNonEssential: () => persist(DEFAULT_DENIED_CATEGORIES),
      openSettings: () => {
        setDraft(consent?.categories ?? DEFAULT_DENIED_CATEGORIES);
        setSettingsOpen(true);
        setBannerOpen(true);
      },
      closeBanner: () => {
        if (consent) {
          setBannerOpen(false);
          setSettingsOpen(false);
        }
      },
      setDraftCategory: (key, enabled) => {
        setDraft((current) => ({ ...current, [key]: enabled }));
      },
      saveSettings: () => persist(draft),
    }),
    [bannerOpen, consent, draft, persist, ready, settingsOpen],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {ready && bannerOpen ? <CookieConsentBanner /> : null}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
}

function CookieConsentBanner() {
  const {
    settingsOpen,
    draft,
    acceptAll,
    rejectNonEssential,
    closeBanner,
    setDraftCategory,
    saveSettings,
    openSettings,
  } = useCookieConsent();

  return (
    <div
      className="cookie-consent-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-ink/45 p-4 sm:items-end sm:p-6"
      role="presentation"
      data-testid="cookie-consent-banner"
    >
      <section
        className="cookie-consent-panel w-full max-w-3xl rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_28px_80px_-36px_rgba(13,27,42,0.55)] sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-primary">Privacy</p>
            <h2 id="cookie-consent-title" className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">
              {settingsOpen ? 'Cookie settings' : 'We use cookies'}
            </h2>
          </div>
          {settingsOpen ? (
            <button
              type="button"
              onClick={closeBanner}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 text-ink/55 transition hover:border-ink/20 hover:text-ink"
              aria-label="Close cookie settings"
            >
              ×
            </button>
          ) : null}
        </div>

        {!settingsOpen ? (
          <>
            <p className="mt-3 text-sm leading-7 text-ink/65">
              We use strictly necessary cookies to run {SITE.name}. With your permission, we also use optional
              cookies for preferences, analytics, advertising, and affiliate tracking. You can accept all,
              reject non-essential cookies, or manage your choices.
            </p>
            <p className="mt-2 text-sm leading-7 text-ink/65">
              Read our{' '}
              <Link href="/legal/cookies" className="font-semibold text-primary underline-offset-2 hover:underline">
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="font-semibold text-primary underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={acceptAll}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-emphasis"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/70 transition hover:border-primary hover:text-primary"
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/70 transition hover:border-primary hover:text-primary"
              >
                Settings
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-7 text-ink/65">
              Strictly necessary cookies are always active because the site needs them to function. Choose which
              optional categories you want to allow.
            </p>
            <ul className="mt-5 space-y-3">
              <li className="rounded-xl border border-ink/10 bg-paper px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-sm font-bold text-ink">Strictly necessary</p>
                    <p className="mt-1 text-sm leading-6 text-ink/60">
                      Required for security, session handling, and remembering your cookie choice.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ink/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/55">
                    Always on
                  </span>
                </div>
              </li>
              {CATEGORY_COPY.map((category) => (
                <li key={category.key} className="rounded-xl border border-ink/10 px-4 py-3">
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span>
                      <span className="font-display text-sm font-bold text-ink">{category.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-ink/60">{category.description}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={draft[category.key]}
                      onChange={(event) => setDraftCategory(category.key, event.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={saveSettings}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-emphasis"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/70 transition hover:border-primary hover:text-primary"
              >
                Accept all
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
