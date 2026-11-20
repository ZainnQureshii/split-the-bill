import type { UseBill } from '../state'
import { Avatar } from './Avatar'

type BreakdownProps = Pick<UseBill, 'result' | 'hasErrors' | 'nameOf' | 'format'>

export function Breakdown({ result, hasErrors, nameOf, format }: BreakdownProps) {
  return (
    <section className="breakdown" aria-labelledby="breakdown-title">
      <div className="section-heading">
        <h2 id="breakdown-title">Everyone’s share</h2>
        <span>{hasErrors ? 'Provisional · resolve errors first' : 'Every cent accounted for'}</span>
      </div>
      <div className="share-grid">
        {result.shares.map(share => (
          <details className="share" key={share.personId}>
            <summary aria-label={`${nameOf(share.personId)}: total share ${format(share.owedCents)}. Show breakdown`}>
              <Avatar personId={share.personId} />
              <span className="share-person">
                <strong>{nameOf(share.personId)}</strong>
                <span>{share.netCents > 0 ? 'Gets back' : share.netCents < 0 ? 'Still owes' : 'All square'} {format(Math.abs(share.netCents))}</span>
              </span>
              <span className="share-amount">{format(share.owedCents)}</span>
              <span className="disclosure-arrow" aria-hidden="true">⌄</span>
            </summary>
            <dl>
              <div><dt>Items</dt><dd>{format(share.subtotalCents)}</dd></div>
              <div><dt>Tax</dt><dd>{format(share.taxCents)}</dd></div>
              <div><dt>Tip</dt><dd>{format(share.tipCents)}</dd></div>
              <div className="share-total"><dt>Total share</dt><dd>{format(share.owedCents)}</dd></div>
              <div><dt>Already paid</dt><dd>{format(share.paidCents)}</dd></div>
              <div className="net">
                <dt>{share.netCents > 0 ? 'Gets back' : share.netCents < 0 ? 'Still owes' : 'All square'}</dt>
                <dd>{format(Math.abs(share.netCents))}</dd>
              </div>
            </dl>
          </details>
        ))}
      </div>
      <p className="breakdown-hint">Select a person to see their share of items, tax and tip, and what they paid.</p>
    </section>
  )
}
