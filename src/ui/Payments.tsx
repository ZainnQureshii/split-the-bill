import type { UseBill } from '../state'
import { Avatar } from './Avatar'
import { AmountInput } from './AmountInput'

type PaymentsProps = Pick<UseBill, 'bill' | 'nameOf' | 'actions' | 'format' | 'currency'>

export function Payments({ bill, nameOf, actions, format, currency }: PaymentsProps) {
  return (
    <section aria-labelledby="paid-title">
      <h2 id="paid-title">Who picked up the bill?</h2>
      <p className="hint">
        One card or several? Enter what each person actually paid.
      </p>
      {!bill.people.length && <p>Add people to record a payment.</p>}
      <ul className="payments">
        {bill.people.map(person => (
          <li key={person.id}>
            <Avatar personId={person.id} />
            <AmountInput
              currency={currency}
              format={format}
              label={`${nameOf(person.id)} paid`}
              cents={bill.paidCents[person.id] ?? 0}
              onChange={cents => actions.setPaid(person.id, cents)}
            />
            <button aria-label={`${nameOf(person.id)} paid it all`} onClick={() => actions.payAll(person.id)}>Paid it all</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
