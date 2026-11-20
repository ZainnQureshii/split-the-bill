import type { Item, UseBill } from '../state'
import { Avatar } from './Avatar'
import { AmountInput } from './AmountInput'
import { AnimatedRow } from './AnimatedRow'

type ItemsProps = Pick<UseBill, 'bill' | 'billVersion' | 'nameOf' | 'actions' | 'format' | 'currency'> & {
  empty: boolean
}

type ItemRowProps = Omit<ItemsProps, 'empty' | 'billVersion'> & {
  item: Item
  index: number
}

function ItemRow({ item, index, bill, nameOf, actions, format, currency }: ItemRowProps) {
  return (
    <AnimatedRow onRemove={() => actions.removeItem(item.id)} focusTarget="add-item">
      {remove => (
        <div className="item-row">
          <div className="item-fields">
            <label className="item-name">
              Item {index + 1}
              <input
                id={`item-${item.id}`}
                value={item.label}
                placeholder="Dish or drink"
                onChange={e => actions.updateItem(item.id, { label: e.target.value })}
              />
            </label>
            <AmountInput
              currency={currency}
              format={format}
              label={`Price · item ${index + 1}`}
              cents={item.amountCents}
              onChange={amountCents => actions.updateItem(item.id, { amountCents })}
            />
            <button
              className="remove"
              aria-label={`Remove item ${index + 1}${item.label ? `: ${item.label}` : ''}`}
              onClick={remove}
            >
              ×
            </button>
          </div>
          <p className="sharing-label">Shared by</p>
          <div
            className="sharers"
            role="group"
            aria-label={`Who shared ${item.label || `item ${index + 1}`}?`}
          >
            {bill.people.map(person => {
              const selected = item.sharedBy.includes(person.id)
              return (
                <button
                  className="person-chip"
                  key={person.id}
                  aria-pressed={selected}
                  onClick={() => actions.toggleSharer(item.id, person.id)}
                >
                  <span className="chip-face">
                    <Avatar personId={person.id} small />
                    {selected && <span className="chip-check" aria-hidden="true">✓</span>}
                  </span>
                  <span>{nameOf(person.id)}</span>
                </button>
              )
            })}
            <button
              className="everyone-button"
              disabled={!bill.people.length}
              onClick={() => actions.shareWithEveryone(item.id)}
            >
              Everyone
            </button>
          </div>
        </div>
      )}
    </AnimatedRow>
  )
}

export function Items({ empty, billVersion, ...props }: ItemsProps) {
  const { bill, actions } = props

  return (
    <section aria-labelledby="items-title">
      <div className="section-heading">
        <h2 id="items-title">What did you order?</h2>
        {!empty && <span>{bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}</span>}
      </div>
      <p className="hint">Tap a name to include them. Shared items split equally.</p>
      <ul className="items" key={billVersion}>
        {bill.items.map((item, index) => (
          <ItemRow key={item.id} item={item} index={index} {...props} />
        ))}
      </ul>
      {!bill.items.length && (
        <p className="hint">Every dish, drink, and extra goes here.</p>
      )}
      <button
        id="add-item"
        onClick={() => {
          const id = actions.addItem()
          requestAnimationFrame(() => document.getElementById(`item-${id}`)?.focus())
        }}
      >
        + Add item
      </button>
    </section>
  )
}
