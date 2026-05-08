function pad(seq: number, width: number): string {
  if (!Number.isInteger(seq) || seq < 0) {
    throw new Error('id generator: seq must be a non-negative integer');
  }
  return seq.toString().padStart(width, '0');
}

export function generateOrderNumber(seq: number, year: number = new Date().getFullYear()): string {
  return `GTX-${year}-${pad(seq, 5)}`;
}

export function generateCustomRequestNumber(
  seq: number,
  year: number = new Date().getFullYear(),
): string {
  return `CR-${year}-${pad(seq, 5)}`;
}
