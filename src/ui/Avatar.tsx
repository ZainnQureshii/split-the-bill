type AvatarProps = {
  personId: string
  small?: boolean
}

// The ID keeps each illustrated face consistent when names or row order change.
export function Avatar({ personId, small = false }: AvatarProps) {
  const seed = Array.from(personId).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
  const variant = seed % 6

  return (
    <span className={`avatar avatar-${variant}${small ? ' avatar-small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" focusable="false">
        <circle cx="24" cy="24" r="24" className="avatar-ground" />
        <path d="M11 28V19C11 1 37 1 37 19V32H11Z" className="avatar-hair" />
        <path d="M5 48C6 32 15 33 24 33S42 32 43 48" className="avatar-shirt" />
        <path d="M20 29H28V36C26 40 22 40 20 36Z" className="avatar-skin" />
        <ellipse cx="24" cy="22" rx="11" ry="13" className="avatar-skin" />
        {variant % 2 === 0 ? (
          <path d="M12 21C9 6 29 3 34 13C28 18 21 17 17 13C17 18 15 20 12 21Z" className="avatar-hair" />
        ) : (
          <path d="M12 20C9 8 21 3 30 8C37 10 38 17 35 23L31 14C24 18 21 12 16 16L14 22Z" className="avatar-hair" />
        )}
        <path d="M19 22V23M29 22V23" className="avatar-features" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M21 28C23 30 26 30 28 27" className="avatar-features" strokeWidth="1.5" strokeLinecap="round" />
        {variant === 1 || variant === 4 ? (
          <g className="avatar-features" strokeWidth="1.2">
            <circle cx="19" cy="23" r="4" />
            <circle cx="29" cy="23" r="4" />
            <path d="M23 23H25" />
          </g>
        ) : null}
      </svg>
    </span>
  )
}
