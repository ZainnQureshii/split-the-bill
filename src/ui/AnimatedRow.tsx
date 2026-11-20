import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type AnimatedRowProps = {
  children: (remove: () => void) => ReactNode
  onRemove: () => void
  focusTarget: string
}

export function AnimatedRow({ children, onRemove, focusTarget }: AnimatedRowProps) {
  const row = useRef<HTMLLIElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [leaving, setLeaving] = useState(false)

  useLayoutEffect(() => {
    const element = row.current
    if (element) {
      element.style.setProperty('--row-height', `${element.scrollHeight}px`)
    }
  }, [])

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  const remove = () => {
    if (timer.current !== null) return
    document.getElementById(focusTarget)?.focus()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onRemove()
      return
    }
    const element = row.current
    if (element) {
      element.style.setProperty('--row-height', `${element.scrollHeight}px`)
    }
    setLeaving(true)
    timer.current = setTimeout(onRemove, 180)
  }

  return (
    <li
      ref={row}
      className={`animated-row${leaving ? ' leaving' : ''}`}
      inert={leaving}
      aria-hidden={leaving || undefined}
    >
      {children(remove)}
    </li>
  )
}
