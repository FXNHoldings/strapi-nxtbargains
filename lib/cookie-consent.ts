export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = 'nxt.cookie-consent.v1';
export const COOKIE_CONSENT_EVENT = 'nxt:cookie-consent';

export type CookieCategoryKey = 'functional' | 'analytics' | 'advertising' | 'affiliate';

export type CookieConsentCategories = {
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
  affiliate: boolean;
};

export type CookieConsentRecord = {
  version: number;
  updatedAt: string;
  categories: CookieConsentCategories;
};

export const DEFAULT_DENIED_CATEGORIES: CookieConsentCategories = {
  functional: false,
  analytics: false,
  advertising: false,
  affiliate: false,
};

export const ACCEPT_ALL_CATEGORIES: CookieConsentCategories = {
  functional: true,
  analytics: true,
  advertising: true,
  affiliate: true,
};

export function createConsentRecord(categories: CookieConsentCategories): CookieConsentRecord {
  return {
    version: COOKIE_CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
    categories,
  };
}

export function parseConsentRecord(raw: string | null): CookieConsentRecord | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (parsed.version !== COOKIE_CONSENT_VERSION || !parsed.categories) return null;

    return {
      version: COOKIE_CONSENT_VERSION,
      updatedAt: parsed.updatedAt,
      categories: {
        functional: Boolean(parsed.categories.functional),
        analytics: Boolean(parsed.categories.analytics),
        advertising: Boolean(parsed.categories.advertising),
        affiliate: Boolean(parsed.categories.affiliate),
      },
    };
  } catch {
    return null;
  }
}

export function readStoredConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null;
  return parseConsentRecord(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function writeStoredConsent(record: CookieConsentRecord) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: record }));
}

export function hasConsent(category: CookieCategoryKey, record: CookieConsentRecord | null): boolean {
  return Boolean(record?.categories[category]);
}
