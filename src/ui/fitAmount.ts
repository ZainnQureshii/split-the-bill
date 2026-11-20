import type { CSSProperties } from 'react'

/**
 * The text and style for an amount, from one formatted string: CSS reads its length (--amount-chars) to shrink
 * it to fit on one line (see .hero-amount in index.css). Spread onto the element: <dd {...fitAmount(text)} />.
 */
export function fitAmount(text: string): { children: string; style: CSSProperties } {
  return { children: text, style: { '--amount-chars': text.length } as CSSProperties }
}
