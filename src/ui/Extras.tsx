import type { UseBill } from '../state'
import { AmountInput } from './AmountInput'

type ExtrasProps = Pick<
  UseBill,
  'bill' | 'tipPercent' | 'isTipPresetSelected' | 'actions' | 'format' | 'currency'
>

const TIP_PRESETS = [0, 10, 15, 20]

export function Extras({ bill, tipPercent, isTipPresetSelected, actions, format, currency }: ExtrasProps) {
  // On a small or zero subtotal several presets round to the same tip; only the lowest shows as pressed.
  const selectedPreset = TIP_PRESETS.find(percent => isTipPresetSelected(percent))
  return (
    <section aria-labelledby="extras-title">
      <h2 id="extras-title">Tax & tip</h2>
      <div className="extras">
        <AmountInput
          currency={currency}
          format={format}
          label="Tax amount"
          cents={bill.taxCents}
          onChange={actions.setTax}
        />
        <AmountInput
          currency={currency}
          format={format}
          label="Tip amount"
          cents={bill.tipCents}
          onChange={actions.setTip}
        />
      </div>
      <div className="tip-presets" role="group" aria-label="Tip percentage">
        {TIP_PRESETS.map(percent => (
          <button
            key={percent}
            aria-pressed={percent === selectedPreset}
            onClick={() => actions.setTipPercent(percent)}
          >
            {percent}%
          </button>
        ))}
        <span>{tipPercent}% of items</span>
      </div>
    </section>
  )
}
