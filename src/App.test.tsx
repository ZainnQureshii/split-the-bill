// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Bill } from './state'

const STORAGE_KEY = 'split-the-bill/v1'

function seed(bill: Partial<Bill>) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ people: [], items: [], taxCents: 0, tipCents: 0, paidCents: {}, ...bill }),
  )
}

const twoPeopleOneDish: Partial<Bill> = {
  people: [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ],
  items: [{ id: 'i1', label: 'Pizza', amountCents: 2000, sharedBy: ['a', 'b'] }],
}

beforeEach(() => {
  localStorage.clear()
  // jsdom has no matchMedia; motion stays on so rows animate out as in a browser.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as typeof window.matchMedia
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('settle-up status', () => {
  it('does not say everyone is square when nobody has paid', () => {
    seed(twoPeopleOneDish)
    render(<App />)
    expect(screen.queryByText(/Everyone is square/)).toBeNull()
  })
})

describe('saved bill', () => {
  it('keeps the chosen currency after a reload', () => {
    seed(twoPeopleOneDish)
    const first = render(<App />)
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'USD' } })
    first.unmount()
    render(<App />)
    expect((screen.getByLabelText('Currency') as HTMLSelectElement).value).toBe('USD')
  })

  it('keeps tax and tip visible and clearable when every person and dish is gone', () => {
    seed({ taxCents: 300, tipCents: 200 })
    render(<App />)
    expect((screen.getByRole('button', { name: 'Clear bill' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByLabelText(/Tax amount/)).toBeTruthy()
  })

  it('does not drop a dish from a freshly loaded sample when its removal was still animating', () => {
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Remove item 5/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Load a sample bill' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, load sample' }))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    const dish = screen.getByDisplayValue('Tiramisu, two spoons')
    expect(dish.closest('li')?.hasAttribute('inert')).toBe(false)
  })
})

describe('tip presets', () => {
  it('keeps a preset selected after the tip is rounded to the cent', () => {
    seed({
      people: [{ id: 'a', name: 'Ada' }],
      items: [{ id: 'i1', label: 'Tea', amountCents: 103, sharedBy: ['a'] }],
      paidCents: { a: 103 },
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '15%' }))
    expect(screen.getByRole('button', { name: '15%' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('tip presets on a zero subtotal', () => {
  it('shows only 0% as pressed while the dishes have no price', () => {
    seed({ people: [{ id: 'a', name: 'Ada' }], items: [{ id: 'i1', label: 'Soup', amountCents: 0, sharedBy: ['a'] }] })
    render(<App />)
    const tipGroup = within(screen.getByRole('group', { name: 'Tip percentage' }))
    const pressed = tipGroup.getAllByRole('button', { pressed: true }).map(b => b.textContent)
    expect(pressed).toEqual(['0%'])
  })
})

describe('inputs', () => {
  it('ignores Add person when the name box is empty', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add person' }))
    expect(screen.getByText('3 people')).toBeTruthy()
  })

  it('saves a cleared amount as zero', () => {
    render(<App />)
    const tax = screen.getByLabelText(/Tax amount/) as HTMLInputElement
    fireEvent.focus(tax)
    fireEvent.change(tax, { target: { value: '' } })
    fireEvent.blur(tax)
    expect(tax.value).toBe('0.00')
  })

  it('names the person on each Paid it all button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Ana paid it all/i })).toBeTruthy()
  })

  it('does not promise a per-dish list the breakdown does not show', () => {
    render(<App />)
    expect(screen.queryByText(/see items, tax, tip, and payments/)).toBeNull()
  })
})

describe('clearing the last amount on a bill', () => {
  it('keeps the tax field while it is still being edited', () => {
    seed({ taxCents: 500 })
    render(<App />)
    const tax = screen.getByLabelText(/Tax amount/) as HTMLInputElement
    tax.focus()
    fireEvent.change(tax, { target: { value: '0' } })
    expect(tax.isConnected).toBe(true)
    fireEvent.change(tax, { target: { value: '4' } })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').taxCents).toBe(400)
  })

  it('keeps the saved tax when it is cleared and replaced with invalid text', () => {
    seed({ ...twoPeopleOneDish, taxCents: 1143 })
    render(<App />)
    const tax = screen.getByLabelText(/Tax amount/) as HTMLInputElement
    tax.focus()
    fireEvent.change(tax, { target: { value: '' } })
    fireEvent.change(tax, { target: { value: 'oops' } })
    fireEvent.blur(tax)
    expect(tax.value).toBe('11.43')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').taxCents).toBe(1143)
  })

  it('puts the old price back when the new one goes over the limit', () => {
    seed(twoPeopleOneDish)
    render(<App />)
    const price = screen.getByLabelText(/Price/) as HTMLInputElement
    price.focus()
    fireEvent.change(price, { target: { value: '10000000' } })
    fireEvent.change(price, { target: { value: '100000000' } })
    fireEvent.blur(price)
    expect(price.value).toBe('20.00')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').items[0].amountCents).toBe(2000)
  })

  it('keeps a payment the app filled in valid when it is focused', () => {
    seed({
      people: [{ id: 'a', name: 'Ada' }],
      items: [
        { id: 'i1', label: 'One', amountCents: 9_999_999_999, sharedBy: ['a'] },
        { id: 'i2', label: 'Two', amountCents: 1, sharedBy: ['a'] },
      ],
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Ada paid it all' }))
    const paid = screen.getByLabelText('Ada paid') as HTMLInputElement
    fireEvent.focus(paid)
    expect(paid.getAttribute('aria-invalid')).toBe('false')
    fireEvent.blur(paid)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').paidCents.a).toBe(10_000_000_000)
  })

  it('shows the welcome again once the last person is removed', () => {
    vi.useFakeTimers()
    seed({ people: [{ id: 'a', name: 'Ada' }] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ada' }))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('Start with your table.')).toBeTruthy()
  })

  it('names the amount field by its label alone', () => {
    seed({ ...twoPeopleOneDish, taxCents: 100 })
    render(<App />)
    const tax = screen.getByRole('textbox', { name: 'Tax amount' })
    fireEvent.focus(tax)
    fireEvent.change(tax, { target: { value: 'oops' } })
    expect(screen.getByRole('textbox', { name: 'Tax amount' })).toBe(tax)
  })

  it('does not undo a newer change when the field is left', () => {
    seed({ ...twoPeopleOneDish, paidCents: { a: 2000 } })
    render(<App />)
    const adaPaid = screen.getByLabelText('Ada paid') as HTMLInputElement
    adaPaid.focus()
    fireEvent.change(adaPaid, { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ben paid it all' }))
    fireEvent.blur(adaPaid)
    const paid = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').paidCents
    expect(paid.a ?? 0).toBe(0)
    expect(paid.b).toBe(2000)
  })

  it('puts back an app-filled amount when its own text is typed back in', () => {
    seed({
      people: [{ id: 'a', name: 'Ada' }],
      items: [{ id: 'i1', label: 'One', amountCents: 9_999_999_999, sharedBy: ['a'] }],
      paidCents: { a: 10_000_000_000 },
    })
    render(<App />)
    const paid = screen.getByLabelText('Ada paid') as HTMLInputElement
    paid.focus()
    fireEvent.change(paid, { target: { value: '1' } })
    fireEvent.change(paid, { target: { value: '100000000.00' } })
    fireEvent.blur(paid)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').paidCents.a).toBe(10_000_000_000)
  })

  it('keeps the next amount field when moving to it after zeroing the last amount', () => {
    seed({ taxCents: 500 })
    render(<App />)
    const tax = screen.getByLabelText(/Tax amount/) as HTMLInputElement
    const tip = screen.getByLabelText(/Tip amount/) as HTMLInputElement
    tax.focus()
    fireEvent.change(tax, { target: { value: '0' } })
    act(() => tip.focus())
    expect(tip.isConnected).toBe(true)
    expect(document.activeElement).toBe(tip)
  })
})
