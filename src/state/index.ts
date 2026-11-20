/**
 * The only import surface the UI is allowed to use.
 *
 * Everything below this line (src/lib, the internals of useBill) is logic and
 * is owned elsewhere. If the UI needs something that is not exported here, that
 * is a gap in the contract to be raised, not a reason to reach past it.
 */
export { useBill, SAMPLE_BILL, CURRENCY_OPTIONS } from './useBill'
export type { UseBill, BillActions } from './useBill'
export { parseAmount, formatCents } from '../lib/money'
export type {
  Bill,
  Issue,
  IssueLevel,
  Item,
  ItemId,
  Person,
  PersonId,
  PersonShare,
  SplitResult,
  Transfer,
} from '../lib/types'
