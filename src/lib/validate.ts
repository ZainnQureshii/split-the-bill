import { formatCents } from './money'
import type { Bill, Issue } from './types'

/**
 * Everything wrong with a bill, in one pass.
 *
 * `error` means the numbers cannot be trusted and the settle-up is meaningless.
 * `warning` means the maths holds but a human probably made a mistake.
 * The UI decides how loudly to say each one; that judgement is not made here.
 */
export function validateBill(bill: Bill, currency = 'EUR'): Issue[] {
  const issues: Issue[] = []
  const { people, items, taxCents, tipCents, paidCents } = bill
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Someone'

  if (people.length === 0) {
    issues.push({ level: 'error', code: 'no-people', message: 'Add at least one person.' })
  }

  if (items.length === 0) {
    issues.push({ level: 'error', code: 'no-items', message: 'Add at least one item.' })
  }

  const seen = new Map<string, number>()
  for (const person of people) {
    const key = person.name.trim().toLowerCase()
    if (key === '') {
      issues.push({
        level: 'warning',
        code: 'unnamed-person',
        message: 'Someone has no name yet.',
        personId: person.id,
      })
      continue
    }
    seen.set(key, (seen.get(key) ?? 0) + 1)
    if (seen.get(key) === 2) {
      issues.push({
        level: 'warning',
        code: 'duplicate-name',
        message: `Two people are called ${person.name.trim()}.`,
        personId: person.id,
      })
    }
  }

  for (const item of items) {
    const label = item.label.trim() || 'An unnamed item'
    if (item.sharedBy.length === 0) {
      issues.push({
        level: 'error',
        code: 'item-unassigned',
        message: `${label} is not assigned to anyone.`,
        itemId: item.id,
      })
    }
    if (item.amountCents < 0) {
      issues.push({
        level: 'error',
        code: 'negative-item-price',
        message: `${label} cannot have a negative price.`,
        itemId: item.id,
      })
    } else if (item.amountCents === 0) {
      issues.push({
        level: 'warning',
        code: 'item-not-positive',
        message: `${label} costs nothing.`,
        itemId: item.id,
      })
    }
  }

  if (taxCents < 0) {
    issues.push({ level: 'error', code: 'negative-tax', message: 'Tax cannot be negative.' })
  }
  if (tipCents < 0) {
    issues.push({ level: 'error', code: 'negative-tip', message: 'Tip cannot be negative.' })
  }

  const totalCents =
    items.reduce((sum, item) => sum + item.amountCents, 0) + taxCents + tipCents
  const paidTotal = people.reduce((sum, p) => sum + (paidCents[p.id] ?? 0), 0)
  const drift = paidTotal - totalCents

  for (const person of people) {
    if ((paidCents[person.id] ?? 0) < 0) {
      issues.push({
        level: 'error',
        code: 'negative-payment',
        message: `${nameOf(person.id)} cannot pay a negative amount.`,
        personId: person.id,
      })
    }
  }

  if (items.length > 0 && paidTotal === 0) {
    issues.push({
      level: 'warning',
      code: 'nobody-paid',
      message: 'Nobody has paid yet, so there is nothing to settle.',
    })
  } else if (drift !== 0) {
    const verb = drift > 0 ? 'more than' : 'less than'
    issues.push({
      level: 'error',
      code: 'payment-mismatch',
      message: `Payments come to ${formatCents(
        Math.abs(drift),
        currency,
      )} ${verb} the bill. Settle-up will be off by that much.`,
    })
  }

  return issues
}
