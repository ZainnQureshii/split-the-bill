import type { PersonId, PersonShare, Transfer } from './types'

const EXACT_BALANCE_LIMIT = 16

interface OutstandingBalance {
  personId: PersonId
  cents: number
}

function largestBalance(balances: OutstandingBalance[]): OutstandingBalance | undefined {
  let largest: OutstandingBalance | undefined
  for (const balance of balances) {
    if (
      !largest ||
      balance.cents > largest.cents ||
      (balance.cents === largest.cents && balance.personId < largest.personId)
    ) {
      largest = balance
    }
  }
  return largest
}

function settleGreedily(shares: PersonShare[]): Transfer[] {
  const creditors: OutstandingBalance[] = []
  const debtors: OutstandingBalance[] = []
  for (const { personId, netCents } of shares) {
    const side = netCents > 0 ? creditors : debtors
    side.push({ personId, cents: Math.abs(netCents) })
  }

  const transfers: Transfer[] = []
  while (true) {
    const credit = largestBalance(creditors)
    const debt = largestBalance(debtors)
    if (!credit?.cents || !debt?.cents) return transfers

    const amountCents = Math.min(credit.cents, debt.cents)
    transfers.push({ from: debt.personId, to: credit.personId, amountCents })
    credit.cents = credit.cents === amountCents ? 0 : credit.cents - amountCents
    debt.cents = debt.cents === amountCents ? 0 : debt.cents - amountCents
  }
}

function settleBalancedGroups(shares: PersonShare[], amounts: bigint[]): Transfer[] {
  const subsetCount = 1 << shares.length
  const sums = [0n]
  const groupCounts = new Uint8Array(subsetCount)
  const removedBits = new Uint16Array(subsetCount)

  for (let subset = 1; subset < subsetCount; subset++) {
    const firstBit = subset & -subset
    sums[subset] = sums[subset ^ firstBit] + amounts[31 - Math.clz32(firstBit)]

    // Each zero-sum subset on a removal path ends one group.
    let bestCount = -1
    for (let bits = subset; bits !== 0; bits &= bits - 1) {
      const bit = bits & -bits
      const count = groupCounts[subset ^ bit]
      if (count > bestCount) {
        bestCount = count
        removedBits[subset] = bit
      }
    }
    groupCounts[subset] = bestCount + Number(sums[subset] === 0n)
  }

  const transfers: Transfer[] = []
  let subset = subsetCount - 1
  let group = 0
  while (subset !== 0) {
    const bit = removedBits[subset]
    group |= bit
    subset ^= bit
    if (sums[subset] === 0n) {
      const members = shares.filter((_, index) => (group & (1 << index)) !== 0)
      transfers.push(...settleGreedily(members))
      group = 0
    }
  }
  return transfers
}

/**
 * For a balanced table with at most 16 non-zero cent balances, partition it
 * into as many zero-sum groups as possible and settle each group greedily.
 * Each group of k people then takes k - 1 payments, minimising the total.
 * Larger or unbalanced tables use the largest remaining debtor and creditor
 * at each step, stopping when either side runs out. Ties break on person ID.
 */
export function settleUp(shares: PersonShare[]): Transfer[] {
  const balances = shares.filter(({ netCents }) => netCents !== 0)
  if (balances.length < 2) return []
  if (
    balances.length > EXACT_BALANCE_LIMIT ||
    balances.some(({ netCents }) => !Number.isInteger(netCents))
  ) {
    return settleGreedily(balances)
  }

  balances.sort((a, b) => {
    if (a.personId === b.personId) return 0
    return a.personId < b.personId ? -1 : 1
  })
  const amounts = balances.map(({ netCents }) => BigInt(netCents))
  if (amounts.reduce((sum, amount) => sum + amount, 0n) !== 0n) {
    return settleGreedily(balances)
  }
  return settleBalancedGroups(balances, amounts)
}
