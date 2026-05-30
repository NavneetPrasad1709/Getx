import { generateTotpSecret, totpKeyUri, verifyTotp } from './totp';

// RFC 6238 Appendix B reference secret (ASCII "12345678901234567890" in base32)
// and its published SHA-1 test vectors (last 6 digits of the 8-digit value).
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP (RFC 6238)', () => {
  it('matches the published SHA-1 test vectors', () => {
    expect(verifyTotp('287082', RFC_SECRET, 0, 59_000)).toBe(true);
    expect(verifyTotp('081804', RFC_SECRET, 0, 1_111_111_109_000)).toBe(true);
    expect(verifyTotp('005924', RFC_SECRET, 0, 1_234_567_890_000)).toBe(true);
  });

  it('rejects an incorrect code', () => {
    expect(verifyTotp('000000', RFC_SECRET, 1, 59_000)).toBe(false);
    expect(verifyTotp('287083', RFC_SECRET, 0, 59_000)).toBe(false);
  });

  it('tolerates ±1 period of clock drift within the window', () => {
    // now=75s → current step is counter 2; the code for counter 1 still passes
    // with window=1, but not with window=0 once two steps have elapsed.
    expect(verifyTotp('287082', RFC_SECRET, 1, 75_000)).toBe(true);
    expect(verifyTotp('287082', RFC_SECRET, 0, 95_000)).toBe(false);
  });

  it('ignores formatting (spaces) and rejects wrong-length input', () => {
    expect(verifyTotp('287 082', RFC_SECRET, 0, 59_000)).toBe(true);
    expect(verifyTotp('12345', RFC_SECRET, 1, 59_000)).toBe(false);
  });

  it('generates a 160-bit base32 secret', () => {
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('builds a scannable otpauth:// URI', () => {
    const uri = totpKeyUri('admin@getx.live', 'GETX', RFC_SECRET);
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri).toContain('issuer=GETX');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});
