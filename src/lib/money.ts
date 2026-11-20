/**
 * All money in this app is integer cents. No float ever touches a total.
 * Every split function is exact: the parts always sum back to the input.
 */

export function formatCents(cents: number, currency = 'EUR', locale = 'en-IE'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
}

/** The largest amount one field accepts, 99,999,999.99. Any real bill's sum stays an exact integer far below it. */
export const MAX_AMOUNT_CENTS = 9_999_999_999

/** "12.34" / "12,34" / "12" -> 1234. Returns null on anything unparseable or above the limit. */
export function parseAmount(input: string): number | null {
  const match = /^(-?)(\d*)(?:[.,](\d{0,2}))?$/.exec(input.trim())
  if (!match) return null
  const [, sign, whole, fraction = ''] = match
  if (whole === '' && fraction === '') return null

  const cents = Number(sign + whole + fraction.padEnd(2, '0'))
  if (Math.abs(cents) > MAX_AMOUNT_CENTS) return null
  return cents === 0 ? 0 : cents // "-0" must not show as a negative zero
}

/**
 * Split `total` into `n` parts that sum exactly to `total`.
 * The indivisible remainder goes to the first `remainder` parts, one cent each,
 * so the result is deterministic rather than "whoever floats highest".
 */
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return []
  const sign = total < 0 ? -1 : 1
  const abs = Math.abs(total)
  const base = Math.floor(abs / n)
  const remainder = abs - base * n
  return Array.from({ length: n }, (_, i) => sign * (base + (i < remainder ? 1 : 0)))
}

/**
 * Split `total` across `weights` proportionally, summing exactly to `total`.
 * Largest-remainder method: floor everything, then hand the leftover cents to
 * the rows with the biggest fractional part (ties break on lower index).
 * Zero total weight falls back to an even split, which is the only defensible
 * answer when nothing distinguishes the rows.
 */
export function prorate(total: number, weights: number[]): number[] {
  const n = weights.length
  if (n === 0) return []
  const integerWeights = weights.map((weight) => BigInt(weight))
  const weightSum = integerWeights.reduce((a, b) => a + b, 0n)
  if (weightSum <= 0n) return splitEvenly(total, n)

  // Older saved bills can contain null for an amount that overflowed.
  const integerTotal = BigInt(total ?? 0)
  const parts = integerWeights.map((weight, index) => {
    const numerator = integerTotal * weight
    const signedRemainder = numerator % weightSum
    const remainder = signedRemainder < 0n ? signedRemainder + weightSum : signedRemainder
    return { index, cents: (numerator - remainder) / weightSum, remainder }
  })
  const leftover = Number(integerTotal - parts.reduce((sum, part) => sum + part.cents, 0n))
  const order = [...parts].sort((a, b) => {
    if (a.remainder === b.remainder) return a.index - b.index
    return a.remainder > b.remainder ? -1 : 1
  })
  for (let i = 0; i < leftover; i++) {
    order[i].cents += 1n
  }
  return parts.map((part) => Number(part.cents))
}
