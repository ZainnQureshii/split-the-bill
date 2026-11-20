import { useId, useState } from 'react'
import { parseAmount } from '../state'
import type { UseBill } from '../state'

type AmountInputProps = Pick<UseBill, 'currency' | 'format'> & {
  cents: number
  onChange: (cents: number) => void
  label: string
}

// lastSaved is the amount this field last wrote, so a blur never undoes a newer change made elsewhere.
type Edit = { text: string; startCents: number; startText: string; lastSaved: number }

export function AmountInput({
  cents,
  onChange,
  currency,
  format,
  label,
}: AmountInputProps) {
  const [edit, setEdit] = useState<Edit | null>(null)
  const id = useId()
  // An amount the app filled in (a total, a tip) stays valid on focus even above the typing limit.
  const invalid =
    edit !== null &&
    edit.text.trim() !== '' &&
    edit.text !== edit.startText &&
    parseAmount(edit.text) === null
  // Keep the formatter's two fractional digits, without its currency or grouping.
  // The currency stays beside the field through focus, typing, and blur.
  const digits = format(cents).replace(/\D/g, '').padStart(3, '0')
  const number = `${cents < 0 ? '-' : ''}${digits.slice(0, -2)}.${digits.slice(-2)}`

  return (
    <label className="amount-field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      <span className="amount-control">
        <span className="amount-currency" aria-hidden="true">{currency}</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={edit?.text ?? number}
          aria-invalid={invalid}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-currency${invalid ? ` ${id}-error` : ''}`}
          onFocus={e => {
            setEdit({ text: number, startCents: cents, startText: number, lastSaved: cents })
            e.currentTarget.select()
          }}
          onChange={e => {
            const text = e.target.value
            // A blank field is saved as zero only when the user leaves it, so the amount
            // saved before stays put if they clear it and then type something invalid.
            const value = parseAmount(text)
            setEdit(current => current && { ...current, text, lastSaved: value ?? current.lastSaved })
            if (value !== null) onChange(value)
          }}
          onBlur={() => {
            // Leaving blank saves zero; leaving text that cannot be saved (invalid, or an app-filled
            // amount over the typing limit typed back in) puts back the amount from before the edit.
            if (edit && cents === edit.lastSaved) {
              if (edit.text.trim() === '') onChange(0)
              else if (parseAmount(edit.text) === null) onChange(edit.startCents)
            }
            setEdit(null)
          }}
        />
      </span>
      <span id={`${id}-currency`} className="sr-only">Amount in {currency}</span>
      {invalid && (
        <small id={`${id}-error`} role="status">
          Use a number up to 99,999,999.99 with at most two decimal places. Invalid text is not saved.
        </small>
      )}
    </label>
  )
}
