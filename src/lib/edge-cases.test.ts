import { describe, expect, it } from 'vitest'
import { parseAmount, prorate } from './money'
import { settleUp } from './settle'
import { validateBill } from './validate'
import type { Bill, PersonShare, Transfer } from './types'

const share = (personId: string, netCents: number): PersonShare => ({
  personId,
  subtotalCents: 0,
  taxCents: 0,
  tipCents: 0,
  owedCents: 0,
  paidCents: 0,
  netCents,
})

/** True when the transfers bring every balance to exactly zero. */
function settlesEveryone(shares: PersonShare[], transfers: Transfer[]): boolean {
  const balance = new Map(shares.map((s) => [s.personId, s.netCents]))
  for (const t of transfers) {
    balance.set(t.from, (balance.get(t.from) ?? 0) + t.amountCents)
    balance.set(t.to, (balance.get(t.to) ?? 0) - t.amountCents)
  }
  return [...balance.values()].every((v) => v === 0)
}

describe('parseAmount edge cases', () => {
  it('rejects a third decimal place instead of rounding it', () => {
    expect(parseAmount('7.999')).toBeNull()
    expect(parseAmount('1.005')).toBeNull()
  })

  it('rejects a comma used as a thousands separator', () => {
    expect(parseAmount('1,234')).toBeNull()
  })

  it('still reads decimal commas and plain amounts', () => {
    expect(parseAmount('12,34')).toBe(1234)
    expect(parseAmount('50,5')).toBe(5050)
    expect(parseAmount('1.15')).toBe(115)
    expect(parseAmount('12')).toBe(1200)
  })

  it('reads minus zero as a plain zero', () => {
    expect(Object.is(parseAmount('-0'), 0)).toBe(true)
    expect(Object.is(parseAmount('-0.00'), 0)).toBe(true)
  })

  it('rejects amounts above 99,999,999.99, where totals could lose cents', () => {
    expect(parseAmount('99999999.99')).toBe(9_999_999_999)
    expect(parseAmount('100000000')).toBeNull()
    expect(parseAmount('90071992547409.91')).toBeNull()
    expect(parseAmount('-100000000')).toBeNull()
  })
})

describe('validateBill edge cases', () => {
  it('treats a negative item price as an error, not a warning', () => {
    const bill: Bill = {
      people: [{ id: 'a', name: 'Ana' }],
      items: [{ id: 'i', label: 'Steak', amountCents: -500, sharedBy: ['a'] }],
      taxCents: 0,
      tipCents: 0,
      paidCents: {},
    }
    const issue = validateBill(bill).find((i) => i.itemId === 'i')
    expect(issue?.level).toBe('error')
  })
})

describe('prorate edge cases', () => {
  it('breaks an exact tie on the lower index, whatever the float error', () => {
    expect(prorate(80, [100, 100, 175])).toEqual([22, 21, 37])
  })
})

describe('settleUp edge cases', () => {
  it('needs only three payments with two creditors and three debtors', () => {
    const shares = [share('a', 1100), share('b', 500), share('c', -800), share('d', -500), share('e', -300)]
    const transfers = settleUp(shares)
    expect(settlesEveryone(shares, transfers)).toBe(true)
    expect(transfers).toHaveLength(3)
  })

  it('pairs a debt and a credit of the same size directly', () => {
    const shares = [share('a', -600), share('b', -500), share('c', -400), share('d', 900), share('e', 600)]
    const transfers = settleUp(shares)
    expect(settlesEveryone(shares, transfers)).toBe(true)
    expect(transfers).toHaveLength(3)
  })

  it('still settles a large table in at most n-1 payments', () => {
    const nets = [700, -300, 450, -1200, 90, -90, 1500, -400, -250, 333, -333, 607, -1107, 25, -25, 200, -200, 1, -1, 0]
    const shares = nets.map((n, i) => share(`p${i}`, n))
    const transfers = settleUp(shares)
    expect(settlesEveryone(shares, transfers)).toBe(true)
    expect(transfers.length).toBeLessThanOrEqual(nets.filter((n) => n !== 0).length - 1)
  })
})
