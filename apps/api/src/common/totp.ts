import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/* AUTH-010 — RFC 6238 TOTP, implemented on Node crypto with no third-party
   dependency (avoids adding otplib/speakeasy to the supply chain for ~60 lines
   of well-specified code). SHA-1 / 6 digits / 30s period — the parameters every
   authenticator app (Google Authenticator, Authy, 1Password) defaults to. */

const DIGITS = 6;
const PERIOD_SECONDS = 30;
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // RFC 4648, no padding

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20)); // 160-bit secret → 32 base32 chars
}

/** otpauth:// URI for QR encoding / manual key entry in authenticator apps. */
export function totpKeyUri(
  accountName: string,
  issuer: string,
  secret: string,
): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Verify a user-supplied code against the secret, tolerating ±`window` steps
 *  of clock drift (default ±1 = ±30s). Constant-time digit comparison. */
export function verifyTotp(
  token: string,
  secret: string,
  window = 1,
  now: number = Date.now(),
): boolean {
  const clean = (token ?? '').replace(/\D/g, '');
  if (clean.length !== DIGITS) return false;

  const counter = Math.floor(now / 1000 / PERIOD_SECONDS);
  for (let offset = -window; offset <= window; offset++) {
    const expected = generateTotp(secret, counter + offset);
    if (constantTimeEqual(clean, expected)) return true;
  }
  return false;
}

function generateTotp(secret: string, counter: number): string {
  const key = base32Decode(secret);

  // 8-byte big-endian counter
  const msg = Buffer.alloc(8);
  // JS bitwise is 32-bit; split into high/low halves.
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac('sha1', key).update(msg).digest();
  const i = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[i] & 0x7f) << 24) |
    ((hmac[i + 1] & 0xff) << 16) |
    ((hmac[i + 2] & 0xff) << 8) |
    (hmac[i + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ─── RFC 4648 base32 (no padding) ─────────────────────────────────────────
function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character in TOTP secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
