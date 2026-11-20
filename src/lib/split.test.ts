import { describe, expect, it } from 'vitest'
import { computeSplit } from './split'
import { settleUp } from './settle'
import type { Bill, PersonShare } from './types'

const people = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Ben' },
  { id: 'c', name: 'Cleo' },
]

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    people,
    items: [
      { id: 'i1', label: 'Steak', amountCents: 3000, sharedBy: ['a'] },
      { id: 'i2', label: 'Soup', amountCents: 1000, sharedBy: ['b'] },
      { id: 'i3', label: 'Wine', amountCents: 2000, sharedBy: ['a', 'b', 'c'] },
    ],
    taxCents: 600,
    tipCents: 900,
    paidCents: { a: 7500 },
    ...overrides,
  }
}

describe('computeSplit', () => {
  it('splits shared items and prorates tax and tip by what you ordered', () => {
    const result = computeSplit(bill())
    const [ana, ben, cleo] = result.shares

    expect(result.subtotalCents).toBe(6000)
    expect(result.totalCents).toBe(7500)

    // Wine is 2000 over three: 667 / 667 / 666.
    expect(ana.subtotalCents).toBe(3667)
    expect(ben.subtotalCents).toBe(1667)
    expect(cleo.subtotalCents).toBe(666)

    // Tax and tip land in proportion to those subtotals.
    expect(ana.taxCents).toBeGreaterThan(cleo.taxCents)
    expect(ana.tipCents).toBeGreaterThan(cleo.tipCents)
  })

  it('never invents or loses a cent', () => {
    const result = computeSplit(bill())
    const owed = result.shares.reduce((sum, s) => sum + s.owedCents, 0)
    expect(owed).toBe(result.totalCents)
  })

  it('nets each person against what they actually paid', () => {
    const result = computeSplit(bill())
    const ana = result.shares[0]
    expect(ana.paidCents).toBe(7500)
    expect(ana.netCents).toBe(7500 - ana.owedCents)
    expect(ana.netCents).toBeGreaterThan(0)
  })

  it('ignores an item nobody is on rather than crashing', () => {
    const result = computeSplit(
      bill({ items: [{ id: 'x', label: 'Ghost', amountCents: 500, sharedBy: [] }] }),
    )
    expect(result.shares.every((s) => s.subtotalCents === 0)).toBe(true)
    expect(result.subtotalCents).toBe(500)
  })
})

describe('settleUp', () => {
  const share = (id: string, net: number): PersonShare => ({
    personId: id,
    subtotalCents: 0,
    taxCents: 0,
    tipCents: 0,
    owedCents: 0,
    paidCents: 0,
    netCents: net,
  })

  it('leaves a settled table alone', () => {
    expect(settleUp([share('a', 0), share('b', 0)])).toEqual([])
  })

  it('settles the simple case with one payment', () => {
    expect(settleUp([share('a', 1000), share('b', -1000)])).toEqual([
      { from: 'b', to: 'a', amountCents: 1000 },
    ])
  })

  it('uses at most n-1 transfers and clears everyone', () => {
    const shares = [share('a', 3000), share('b', -1000), share('c', -1500), share('d', -500)]
    const transfers = settleUp(shares)

    expect(transfers.length).toBeLessThanOrEqual(shares.length - 1)

    const net = new Map(shares.map((s) => [s.personId, s.netCents]))
    for (const t of transfers) {
      net.set(t.from, (net.get(t.from) ?? 0) + t.amountCents)
      net.set(t.to, (net.get(t.to) ?? 0) - t.amountCents)
    }
    expect([...net.values()].every((v) => v === 0)).toBe(true)
  })

  it('does not route money through someone who is already square', () => {
    const transfers = settleUp([share('a', 500), share('b', 0), share('c', -500)])
    expect(transfers).toEqual([{ from: 'c', to: 'a', amountCents: 500 }])
  })

  it('settles what it can when the payments do not add up', () => {
    // Only 300 of the 500 owed is covered; the rest stays open.
    const transfers = settleUp([share('a', 500), share('b', -300)])
    expect(transfers).toEqual([{ from: 'b', to: 'a', amountCents: 300 }])
  })
})
