import type { UseBill } from '../state'
import { Avatar } from './Avatar'
import { Breakdown } from './Breakdown'

type AnswerColumnProps = Pick<
  UseBill,
  'bill' | 'result' | 'issues' | 'hasErrors' | 'format' | 'nameOf'
> & {
  empty: boolean
}

export function AnswerColumn({
  bill,
  result,
  issues,
  hasErrors,
  format,
  nameOf,
  empty,
}: AnswerColumnProps) {
  const waitingForPayment = issues.some(issue => issue.code === 'nobody-paid')
  const pending = empty || hasErrors || waitingForPayment
  const settled = !pending && result.transfers.length === 0

  return (
    <aside className="answer-column" aria-label="Bill result">
      <section className="totals" aria-labelledby="total-title">
        <div className="total-heading">
          <h2 id="total-title">Your bill total</h2>
          <span className="total-status">{empty ? 'Ready when you are' : pending ? 'In progress' : 'Split calculated'}</span>
        </div>
        {!empty && <p className="hero-amount">{format(result.totalCents)}</p>}
        <div className="table-group">
          {bill.people.length > 0 && (
            <div className="avatar-stack" aria-hidden="true">
              {bill.people.slice(0, 5).map(person => <Avatar key={person.id} personId={person.id} />)}
              {bill.people.length > 5 && <span className="avatar-overflow">+{bill.people.length - 5}</span>}
            </div>
          )}
          <span>{bill.people.length === 0 ? 'Add your people to start splitting' : `Shared by ${bill.people.length} ${bill.people.length === 1 ? 'person' : 'people'}`}</span>
        </div>
        {!empty && (
          <dl className="total-parts">
            <div><dt>Items</dt><dd>{format(result.subtotalCents)}</dd></div>
            <div><dt>Tax</dt><dd>{format(bill.taxCents)}</dd></div>
            <div><dt>Tip</dt><dd>{format(bill.tipCents)}</dd></div>
          </dl>
        )}
      </section>
      <div className="issues" aria-live="polite" aria-atomic="true">
        {!empty && issues.length > 0 && (
          <section aria-labelledby="issues-title">
            <h2 id="issues-title">Before you settle</h2>
            <ul>
              {issues.map((issue, i) => (
                <li key={`${issue.code}-${issue.message}-${i}`} className={`issue ${issue.level}`}>
                  <strong>{issue.level === 'error' ? 'Error: needs fixing' : 'Warning: double-check'}</strong>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <section
        className={`settlement${pending ? ' pending' : ''}${settled ? ' is-settled' : ''}`}
        aria-labelledby="settle-title"
      >
        <div className="section-heading">
          <h2 id="settle-title">Settle up</h2>
          {settled && <span className="section-badge" aria-hidden="true">✓</span>}
        </div>
        {empty ? (
          <p>Add people and items. Your settle-up plan will appear here.</p>
        ) : hasErrors ? (
          <p className="held">Settle-up on hold. Fix the errors above to get the final payments.</p>
        ) : waitingForPayment ? (
          <p>Enter who paid to see who owes whom.</p>
        ) : settled ? (
          <div className="settled">
            <h3>Everyone is square.</h3>
            <p>No payments needed. You’re all settled.</p>
          </div>
        ) : (
          <>
            <p>{result.transfers.length} {result.transfers.length === 1 ? 'payment' : 'payments'} and you’re even.</p>
            <ol className="transfers" key={JSON.stringify(result.transfers)}>
              {result.transfers.map((transfer, i) => (
                <li key={i}>
                  <Avatar personId={transfer.from} />
                  <p><strong>{nameOf(transfer.from)}</strong><span> pays {nameOf(transfer.to)}</span></p>
                  <div className="transfer-amount">{format(transfer.amountCents)}</div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
      {!empty && <Breakdown result={result} hasErrors={hasErrors} nameOf={nameOf} format={format} />}
    </aside>
  )
}
