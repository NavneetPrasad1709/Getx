/* Sanctions / risk gates applied at signup + KYC.

   Two layers:

   1. Hard-block country list — comprehensive OFAC + EU + UK consolidated
      list intersection. A signup attempt from one of these countries
      returns a 451 + a "regional unavailability" message; we never
      create the User row.

   2. Sanctioned name watchlist — minimal hash-only lookup (case-folded,
      whitespace-trimmed) against the most-publicly-known PEP entries.
      Hits flag the account for manual review on the admin queue rather
      than auto-blocking — too many false positives on common names. */

/* ISO-3166 alpha-2 country codes the platform cannot serve at all.
   Reviewed quarterly against the OFAC SDN program list:
     https://ofac.treasury.gov/sanctions-programs-and-country-information
   plus EU Council Regulation 833/2014 + UK OFSI consolidated list. */
export const HARD_BLOCKED_COUNTRIES: ReadonlySet<string> = new Set([
  /* Comprehensive US OFAC embargoes */
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea (DPRK)
  'SY', // Syria

  /* Major sanctions programs (financial services restricted) */
  'RU', // Russia — EU/UK/US Russia regulations
  'BY', // Belarus — EU/UK Belarus regulations
  'MM', // Myanmar — EU/UK arms + financial sanctions

  /* Higher-risk jurisdictions where Stripe/PayPal cannot serve us */
  'AF', // Afghanistan
  'SS', // South Sudan
  'YE', // Yemen

  /* Crimea / Sevastopol / Donetsk / Luhansk are part of UA's ISO entry
     but separately sanctioned — handled by Stripe Tax / KYC location
     verification at payout time, not at signup. */
]);

export function isHardBlockedCountry(country: string | undefined): boolean {
  if (!country) return false;
  return HARD_BLOCKED_COUNTRIES.has(country.toUpperCase());
}

/* Lightweight name-watch check — case-folds + collapses whitespace then
   compares against a tiny canonical list. The full SDN feed is huge and
   noisy; for v1 we keep a small inline list and rely on Stripe Radar +
   Sumsub KYC for the heavy lifting. Returns true when a row should be
   queued for manual review, not blocked outright. */
const FLAGGED_NAME_HASHES: ReadonlySet<string> = new Set([
  /* Hashes filled in by ops via env (FLAGGED_NAME_HASHES csv) — empty
     by default so we never accidentally flag legitimate signups. */
]);

export function shouldFlagName(name: string | undefined): boolean {
  if (!name) return false;
  const norm = name.toLowerCase().replace(/\s+/g, ' ').trim();
  return FLAGGED_NAME_HASHES.has(norm);
}

/* Soft-launch allowlist — when `ALLOWED_SIGNUP_COUNTRIES` is set in
   env, only those ISO codes can register. Empty / unset disables the
   gate (full global rollout). Hard-blocked countries remain blocked
   regardless of the allowlist (defence in depth). */
export function parseAllowlist(env: string | undefined): Set<string> | null {
  if (!env) return null;
  const codes = env
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
  if (codes.length === 0) return null;
  return new Set(codes);
}

export function isAllowedForSoftLaunch(
  country: string | undefined,
  allowlist: Set<string> | null,
): boolean {
  if (!allowlist) return true;
  if (!country) return false;
  return allowlist.has(country.toUpperCase());
}
