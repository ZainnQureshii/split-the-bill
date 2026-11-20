import { useState } from 'react'
import { CURRENCY_OPTIONS, useBill } from './state'
import { AnswerColumn } from './ui/AnswerColumn'
import { BillFooter } from './ui/BillFooter'
import { Extras } from './ui/Extras'
import { Items } from './ui/Items'
import { Payments } from './ui/Payments'
import { People } from './ui/People'

export default function App() {
  const billState = useBill()
  const { bill, currency, setCurrency, actions } = billState
  // While someone is typing an amount, clearing the bill's last one must not swap the page
  // to the empty state under their cursor; it does so once focus leaves that field.
  const [editing, setEditing] = useState(false)
  const billIsEmpty =
    bill.people.length === 0 &&
    bill.items.length === 0 &&
    (bill.taxCents ?? 0) === 0 &&
    (bill.tipCents ?? 0) === 0 &&
    Object.values(bill.paidCents).every(cents => (cents ?? 0) === 0)
  const empty = billIsEmpty && !editing

  return (
    <main id="top">
      <header className="masthead">
        <a href="#top" className="wordmark">
          <span className="brand-symbol" aria-hidden="true">÷</span>
          split the bill<span className="brand-dot">.</span>
        </a>
        <span className="masthead-note">A good meal. A fair split.</span>
      </header>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Shared dinner, sorted</p>
          <h1>Let’s call it even.</h1>
          <p>Add what you shared. See exactly who owes whom.</p>
        </div>
        <label className="currency">
          Currency
          <span className="select-control">
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCY_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>{code} · {label}</option>
              ))}
            </select>
          </span>
        </label>
      </div>
      {empty && (
        <section className="welcome">
          <h2>Start with your table.</h2>
          <p>Add everyone who ate, enter the dishes, then tap who shared each one.</p>
          <a className="button primary" href="#new-person">Add people ↓</a>
          <button className="text-button" onClick={actions.loadSample}>
            Load a sample bill
          </button>
        </section>
      )}
      <div className="workspace">
        <div
          className="bill-entry"
          onFocus={e => {
            const inAmount = e.target.closest('.amount-field') !== null
            // Moving from one amount field to the next keeps the hold, so the next field is not removed.
            setEditing(held => inAmount && (held || !billIsEmpty))
          }}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setEditing(false) }}
        >
          <People {...billState} empty={empty} />
          <Items {...billState} empty={empty} />
          {!empty && (
            <>
              <Extras {...billState} />
              <Payments {...billState} />
            </>
          )}
        </div>
        <AnswerColumn {...billState} empty={empty} />
      </div>
      <BillFooter actions={actions} empty={empty} />
    </main>
  )
}
