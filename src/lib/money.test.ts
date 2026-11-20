import { describe, expect, it } from 'vitest'
import { parseAmount, prorate, splitEvenly } from './money'

describe('splitEvenly', () => {
  it('divides cleanly when it can', () => {
    expect(splitEvenly(1000, 4)).toEqual([250, 250, 250, 250])
  })

  it('hands the indivisible cents to the front, deterministically', () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333])
    expect(splitEvenly(1, 3)).toEqual([1, 0, 0])
  })

  it('always sums back to the input', () => {
    for (let total = 0; total < 200; total++) {
      for (let n = 1; n <= 7; n++) {
        expect(splitEvenly(total, n).reduce((a, b) => a + b, 0)).toBe(total)
      }
    }
  })

  it('handles a negative total without leaking a cent', () => {
    expect(splitEvenly(-1000, 3).reduce((a, b) => a + b, 0)).toBe(-1000)
  })

  it('returns nothing for nobody', () => {
    expect(splitEvenly(1000, 0)).toEqual([])
  })
})

describe('prorate', () => {
  it('follows the weights', () => {
    expect(prorate(300, [100, 200])).toEqual([100, 200])
  })

  it('gives leftover cents to the largest fraction', () => {
    // 10 cents over three equal weights: 3.33 each, one cent left over.
    expect(prorate(10, [1, 1, 1])).toEqual([4, 3, 3])
  })

  it('sums exactly even on awkward weights', () => {
    const parts = prorate(1000, [7, 11, 13, 17])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it('falls back to an even split when no weight distinguishes anyone', () => {
    expect(prorate(900, [0, 0, 0])).toEqual([300, 300, 300])
  })
})

describe('parseAmount', () => {
  it('reads the shapes people type', () => {
    expect(parseAmount('12.34')).toBe(1234)
    expect(parseAmount('12,34')).toBe(1234)
    expect(parseAmount(' 12 ')).toBe(1200)
    expect(parseAmount('.5')).toBe(50)
  })

  it('rejects what it cannot read', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.2.3')).toBeNull()
  })
})
