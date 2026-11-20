import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatCents } from '../lib/money'
import { computeSplit } from '../lib/split'
import { validateBill } from '../lib/validate'
import type { Bill, Issue, Item, ItemId, PersonId, SplitResult } from '../lib/types'

const STORAGE_KEY = 'split-the-bill/v1'
const CURRENCY_STORAGE_KEY = 'split-the-bill/currency'
const DEFAULT_CURRENCY = 'EUR'

export const CURRENCY_OPTIONS = [
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'US dollar' },
  { code: 'GBP', label: 'Pound' },
]

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10)

export const SAMPLE_BILL: Bill = {
  people: [
    { id: 'p-ana', name: 'Ana' },
    { id: 'p-ben', name: 'Ben' },
    { id: 'p-cleo', name: 'Cleo' },
  ],
  items: [
    { id: 'i-1', label: 'Ribeye', amountCents: 3200, sharedBy: ['p-ana'] },
    { id: 'i-2', label: 'Sea bass', amountCents: 2600, sharedBy: ['p-ben'] },
    { id: 'i-3', label: 'Mushroom risotto', amountCents: 1900, sharedBy: ['p-cleo'] },
    { id: 'i-4', label: 'Bottle of albariño', amountCents: 2800, sharedBy: ['p-ana', 'p-ben', 'p-cleo'] },
    { id: 'i-5', label: 'Tiramisu, two spoons', amountCents: 900, sharedBy: ['p-ana', 'p-cleo'] },
  ],
  taxCents: 1143,
  tipCents: 1750,
  paidCents: { 'p-ana': 14293 },
}

const EMPTY_BILL: Bill = {
  people: [],
  items: [],
  taxCents: 0,
  tipCents: 0,
  paidCents: {},
}

function load(): Bill {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SAMPLE_BILL
    const parsed = JSON.parse(raw) as Bill
    if (!Array.isArray(parsed.people) || !Array.isArray(parsed.items)) return SAMPLE_BILL
    return { ...EMPTY_BILL, ...parsed }
  } catch {
    return SAMPLE_BILL
  }
}

function loadCurrency(): string {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
    return CURRENCY_OPTIONS.find(({ code }) => code === saved)?.code ?? DEFAULT_CURRENCY
  } catch {
    return DEFAULT_CURRENCY
  }
}

function tipForPercent(subtotalCents: number, percent: number): number {
  return Math.round((subtotalCents * percent) / 100)
}

export interface BillActions {
  addPerson: (name?: string) => PersonId
  renamePerson: (id: PersonId, name: string) => void
  removePerson: (id: PersonId) => void
  addItem: (label?: string) => ItemId
  updateItem: (id: ItemId, patch: Partial<Pick<Item, 'label' | 'amountCents'>>) => void
  removeItem: (id: ItemId) => void
  /** Put a person on an item, or take them off it. */
  toggleSharer: (itemId: ItemId, personId: PersonId) => void
  /** Put everyone on an item at once. */
  shareWithEveryone: (itemId: ItemId) => void
  setTax: (cents: number) => void
  setTip: (cents: number) => void
  /** Tip as a percentage of the item subtotal, rounded to the cent. */
  setTipPercent: (percent: number) => void
  setPaid: (personId: PersonId, cents: number) => void
  /** Mark one person as having covered the whole bill. */
  payAll: (personId: PersonId) => void
  loadSample: () => void
  clear: () => void
}

export interface UseBill {
  bill: Bill
  billVersion: number
  result: SplitResult
  issues: Issue[]
  /** True when the numbers cannot be trusted, so the settle-up should be held back. */
  hasErrors: boolean
  currency: string
  setCurrency: (code: string) => void
  /** Cents to a display string in the current currency. */
  format: (cents: number) => string
  /** Convenience lookup: person id to name. Falls back to a placeholder, never undefined. */
  nameOf: (id: PersonId) => string
  /** The tip as a percentage of the subtotal, for display. */
  tipPercent: number
  isTipPresetSelected: (percent: number) => boolean
  actions: BillActions
}

/**
 * The whole app state in one hook. Everything the UI needs comes from here and
 * nothing else: no component computes money, and no component reaches into the
 * lib functions directly.
 */
export function useBill(): UseBill {
  const [{ bill, billVersion }, setBillState] = useState(() => ({ bill: load(), billVersion: 0 }))
  const [currency, setCurrency] = useState(loadCurrency)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bill))
    } catch {
      // A full or blocked storage quota is not worth breaking the page over.
    }
  }, [bill])

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
    } catch {
      // The currency can still be selected when storage is blocked.
    }
  }, [currency])

  const result = useMemo(() => computeSplit(bill), [bill])
  const issues = useMemo(() => validateBill(bill, currency), [bill, currency])
  const hasErrors = issues.some((i) => i.level === 'error')

  const format = useCallback((cents: number) => formatCents(cents, currency), [currency])

  const nameOf = useCallback(
    (id: PersonId) => bill.people.find((p) => p.id === id)?.name.trim() || 'Someone',
    [bill.people],
  )

  const tipPercent = useMemo(() => {
    if (result.subtotalCents <= 0) return 0
    return Math.round((bill.tipCents / result.subtotalCents) * 1000) / 10
  }, [bill.tipCents, result.subtotalCents])

  const isTipPresetSelected = useCallback(
    (percent: number) => tipForPercent(result.subtotalCents, percent) === bill.tipCents,
    [bill.tipCents, result.subtotalCents],
  )

  const actions = useMemo<BillActions>(() => {
    const patch = (update: (draft: Bill) => Bill, expectedVersion?: number) => {
      setBillState((current) => {
        if (expectedVersion !== undefined && current.billVersion !== expectedVersion) return current
        return { ...current, bill: update(current.bill) }
      })
    }
    const replaceBill = (nextBill: Bill) => {
      setBillState((current) => ({ bill: nextBill, billVersion: current.billVersion + 1 }))
    }

    return {
      addPerson(name = '') {
        const id = newId()
        patch((b) => ({ ...b, people: [...b.people, { id, name }] }))
        return id
      },
      renamePerson(id, name) {
        patch((b) => ({
          ...b,
          people: b.people.map((p) => (p.id === id ? { ...p, name } : p)),
        }))
      },
      removePerson(id) {
        patch((b) => {
          const { [id]: _dropped, ...paidCents } = b.paidCents
          return {
            ...b,
            people: b.people.filter((p) => p.id !== id),
            items: b.items.map((it) => ({
              ...it,
              sharedBy: it.sharedBy.filter((pid) => pid !== id),
            })),
            paidCents,
          }
        }, billVersion)
      },
      addItem(label = '') {
        const id = newId()
        patch((b) => ({
          ...b,
          items: [...b.items, { id, label, amountCents: 0, sharedBy: [] }],
        }))
        return id
      },
      updateItem(id, itemPatch) {
        patch((b) => ({
          ...b,
          items: b.items.map((it) => (it.id === id ? { ...it, ...itemPatch } : it)),
        }))
      },
      removeItem(id) {
        patch((b) => ({ ...b, items: b.items.filter((it) => it.id !== id) }), billVersion)
      },
      toggleSharer(itemId, personId) {
        patch((b) => ({
          ...b,
          items: b.items.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  sharedBy: it.sharedBy.includes(personId)
                    ? it.sharedBy.filter((id) => id !== personId)
                    : [...it.sharedBy, personId],
                }
              : it,
          ),
        }))
      },
      shareWithEveryone(itemId) {
        patch((b) => ({
          ...b,
          items: b.items.map((it) =>
            it.id === itemId ? { ...it, sharedBy: b.people.map((p) => p.id) } : it,
          ),
        }))
      },
      setTax(cents) {
        patch((b) => ({ ...b, taxCents: cents }))
      },
      setTip(cents) {
        patch((b) => ({ ...b, tipCents: cents }))
      },
      setTipPercent(percent) {
        patch((b) => {
          const subtotal = b.items.reduce((sum, it) => sum + it.amountCents, 0)
          return { ...b, tipCents: tipForPercent(subtotal, percent) }
        })
      },
      setPaid(personId, cents) {
        patch((b) => ({ ...b, paidCents: { ...b.paidCents, [personId]: cents } }))
      },
      payAll(personId) {
        patch((b) => {
          const total =
            b.items.reduce((sum, it) => sum + it.amountCents, 0) + b.taxCents + b.tipCents
          return { ...b, paidCents: { [personId]: total } }
        })
      },
      loadSample() {
        replaceBill(SAMPLE_BILL)
      },
      clear() {
        replaceBill(EMPTY_BILL)
      },
    }
  }, [billVersion])

  return {
    bill,
    billVersion,
    result,
    issues,
    hasErrors,
    currency,
    setCurrency,
    format,
    nameOf,
    tipPercent,
    isTipPresetSelected,
    actions,
  }
}
