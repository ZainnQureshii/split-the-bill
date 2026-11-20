import { useState } from 'react'
import type { UseBill } from '../state'

type BillFooterProps = Pick<UseBill, 'actions'> & {
  empty: boolean
}

export function BillFooter({ actions, empty }: BillFooterProps) {
  const [confirm, setConfirm] = useState<'clear' | 'sample' | null>(null)

  return (
    <footer>
      <p>Good food. No loose ends.</p>
      <div>
        <button
          className="text-button"
          onClick={() => empty ? actions.loadSample() : setConfirm('sample')}
        >
          Load a sample bill
        </button>
        <button
          className="text-button"
          disabled={empty}
          onClick={() => setConfirm('clear')}
        >
          Clear bill
        </button>
      </div>
      {confirm && (
        <div className="confirm" role="group" aria-label="Confirm replacing bill">
          <p>
            {confirm === 'clear' ? 'Clear this bill and start fresh?' : 'Replace this bill with the sample?'}
          </p>
          <button
            onClick={() => {
              if (confirm === 'clear') actions.clear()
              else actions.loadSample()
              setConfirm(null)
            }}
          >
            Yes, {confirm === 'clear' ? 'clear bill' : 'load sample'}
          </button>
          <button autoFocus onClick={() => setConfirm(null)}>Keep this bill</button>
        </div>
      )}
    </footer>
  )
}
