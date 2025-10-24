/**
 * Safe number formatting utilities to prevent runtime errors
 * with null/undefined values
 */

/**
 * Safely format a number or string to a locale string
 * Returns '0' if the value is null, undefined, or NaN
 */
export function formatNumber(num: string | number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString();
}

/**
 * Safely format a number to a fixed decimal string
 * Returns '0.0000' (or appropriate decimal places) if the value is null, undefined, or NaN
 */
export function formatFixed(
  num: string | number | null | undefined,
  decimals: number = 4
): string {
  if (num === null || num === undefined) return '0.' + '0'.repeat(decimals);
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0.' + '0'.repeat(decimals);
  return n.toFixed(decimals);
}

/**
 * Safely format a number as currency (USD)
 * Returns '$0.0000' if the value is null, undefined, or NaN
 */
export function formatCurrency(
  num: string | number | null | undefined,
  decimals: number = 4
): string {
  return '$' + formatFixed(num, decimals);
}

/**
 * Safely divide two numbers, handling null/undefined and division by zero
 * Returns 0 if either operand is invalid or divisor is zero
 */
export function safeDivide(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  decimals?: number
): number {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    denominator === 0
  ) {
    return 0;
  }

  const result = numerator / denominator;

  if (decimals !== undefined) {
    return parseFloat(result.toFixed(decimals));
  }

  return result;
}

/**
 * Safely parse a string or number to a number
 * Returns 0 if the value is null, undefined, or NaN
 */
export function safeParseNumber(num: string | number | null | undefined): number {
  if (num === null || num === undefined) return 0;
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return isNaN(n) ? 0 : n;
}
