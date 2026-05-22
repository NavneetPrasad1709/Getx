import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const SCRYPT_SALT = 'getx-pii-v1';

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'PII_ENCRYPTION_KEY is required to encrypt withdrawal PII.',
    );
  }
  // Accept either a hex 32-byte key directly or derive deterministically via scrypt
  // so operators can rotate between formats without re-encrypting everything.
  const direct = Buffer.from(raw, 'hex');
  cachedKey =
    direct.length === KEY_BYTES
      ? direct
      : scryptSync(raw, SCRYPT_SALT, KEY_BYTES);
  return cachedKey;
}

/**
 * Encrypts plaintext PII (bank/UPI/etc.) to a single base64 blob:
 *   base64(iv | authTag | ciphertext)
 *
 * Storing the auth tag with the ciphertext means a single column read is enough
 * to verify integrity — no out-of-band metadata to lose.
 */
export function encryptPii(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPii(blob: string): string {
  const buf = Buffer.from(blob, 'base64');
  if (buf.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error('Encrypted PII blob is too short to be valid.');
  }
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
