import { prorate, splitEvenly } from './money'
import { settleUp } from './settle'
import type { Bill, PersonShare, SplitResult } from './types'

/**
 * Turn a bill into what each person owes and who pays whom.
 *
 * Order of operations matters: items are split first, then tax and tip are
 * prorated against each person's item subtotal. Prorating means the person who
 * ordered the steak carries more of the tax than the person who had soup, which
 * is what people actually expect even when they cannot articulate it.
 */
export function computeSplit(bill: Bill): SplitResult {
  const { people, items, taxCents, tipCents, paidCents } = bill

  const subtotalByPerson = new Map<string, number>(people.map((p) => [p.id, 0]))

  for (const item of items) {
    const sharers = item.sharedBy.filter((id) => subtotalByPerson.has(id))
    if (sharers.length === 0) continue
    const parts = splitEvenly(item.amountCents, sharers.length)
    sharers.forEach((id, i) => {
      subtotalByPerson.set(id, (subtotalByPerson.get(id) ?? 0) + parts[i])
    })
  }

  const weights = people.map((p) => subtotalByPerson.get(p.id) ?? 0)
  const taxParts = prorate(taxCents, weights)
  const tipParts = prorate(tipCents, weights)

  const shares: PersonShare[] = people.map((person, i) => {
    const subtotal = weights[i]
    const tax = taxParts[i]
    const tip = tipParts[i]
    const owed = subtotal + tax + tip
    const paid = paidCents[person.id] ?? 0
    return {
      personId: person.id,
      subtotalCents: subtotal,
      taxCents: tax,
      tipCents: tip,
      owedCents: owed,
      paidCents: paid,
      netCents: paid - owed,
    }
  })

  const subtotalCents = items.reduce((sum, item) => sum + item.amountCents, 0)

  return {
    subtotalCents,
    totalCents: subtotalCents + taxCents + tipCents,
    shares,
    transfers: settleUp(shares),
  }
}
