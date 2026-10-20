/** Format a sequence number the same way the frontend does: `پ-۱۴۰۵-۰۰۰۱`. */
export function formatSequenceNumber(
  prefix: string,
  year: string,
  sequence: number,
  pad = 4,
): string {
  return `${prefix}${year}-${String(sequence).padStart(pad, '0')}`;
}
