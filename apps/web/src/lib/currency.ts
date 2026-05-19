/* Currency formatter — single source of truth for every price-rendering
   surface in the buyer app. Replaces the per-component formatINR / inr()
   helpers that were hardcoding ₹.

   Globally-aware: the formatter picks the right locale + decimal rules per
   ISO-4217 code. JPY / KRW / INR render with zero decimals; everything
   else renders with two. Symbols come from the runtime Intl table so we
   don't ship a brittle hand-rolled map. */

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'AUD',
  'CAD',
  'SGD',
  'PHP',
  'BRL',
  'MXN',
  'JPY',
  'KRW',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const LOCALE_FOR: Record<string, string> = {
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  INR: 'en-IN',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  PHP: 'en-PH',
  BRL: 'pt-BR',
  MXN: 'es-MX',
  JPY: 'ja-JP',
  KRW: 'ko-KR',
};

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'INR']);

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  IE: 'EUR',
  NL: 'EUR',
  JP: 'JPY',
  KR: 'KRW',
  SG: 'SGD',
  PH: 'PHP',
  BR: 'BRL',
  MX: 'MXN',
  AU: 'AUD',
  CA: 'CAD',
};

export function formatMoney(amount: number, currency: string | null | undefined): string {
  const code = (currency || 'USD').toUpperCase();
  const locale = LOCALE_FOR[code] ?? 'en-US';
  const maxFrac = ZERO_DECIMAL.has(code) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: maxFrac,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${code} ${(Number.isFinite(amount) ? amount : 0).toFixed(maxFrac)}`;
  }
}

/* Compact form for tight UI like header pills + bottom-nav badges.
   "$1,234,567" → "$1.2M", "₹4,800" → "₹4.8K". Falls back to formatMoney. */
export function formatMoneyCompact(
  amount: number,
  currency: string | null | undefined,
): string {
  const code = (currency || 'USD').toUpperCase();
  const locale = LOCALE_FOR[code] ?? 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return formatMoney(amount, currency);
  }
}

/* Bare symbol — for inline labels like "Bal $" headings. Derived from the
   Intl table so we never hand-curate symbol strings. */
export function symbolFor(currency: string | null | undefined): string {
  return (formatMoney(0, currency).replace(/[\d.,\s ]/g, '') || '$').trim();
}

/* Country → ISO-4217 default. Used at signup + when seeding a new user's
   preferredCurrency. Returns USD as the safe fallback. */
export function currencyForCountry(
  country: string | null | undefined,
): CurrencyCode {
  if (!country) return 'USD';
  const code = COUNTRY_TO_CURRENCY[country.toUpperCase()];
  return code ?? 'USD';
}
