export type PersonId = string
export type ItemId = string

export interface Person {
  id: PersonId
  name: string
}

/** An ordered line on the bill. `sharedBy` is who splits it, equally. */
export interface Item {
  id: ItemId
  label: string
  amountCents: number
  sharedBy: PersonId[]
}

export interface Bill {
  people: Person[]
  items: Item[]
  taxCents: number
  tipCents: number
  /** How much each person actually put on the table. Missing = 0. */
  paidCents: Record<PersonId, number>
}

export interface PersonShare {
  personId: PersonId
  subtotalCents: number
  taxCents: number
  tipCents: number
  owedCents: number
  paidCents: number
  /** paid - owed. Positive = is owed money. Negative = owes money. */
  netCents: number
}

export interface Transfer {
  from: PersonId
  to: PersonId
  amountCents: number
}

export interface SplitResult {
  subtotalCents: number
  totalCents: number
  shares: PersonShare[]
  transfers: Transfer[]
}

export type IssueLevel = 'error' | 'warning'

export interface Issue {
  level: IssueLevel
  code: string
  message: string
  /** Which entity the issue points at, when it points at one. */
  itemId?: ItemId
  personId?: PersonId
}
