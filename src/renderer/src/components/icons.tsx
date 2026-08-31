export function SoundIcon({ muted }: { muted: boolean }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="square" strokeLinejoin="miter" d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z" />
      {muted ? (
        <path strokeLinecap="square" d="m15 9 6 6m0-6-6 6" />
      ) : (
        <path strokeLinecap="square" d="M15 9.5a4 4 0 0 1 0 5m2.5-7.5a7 7 0 0 1 0 10" />
      )}
    </svg>
  )
}

export function BellIcon({ blocked }: { blocked: boolean }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
      />
      {blocked && <path strokeLinecap="square" d="M4 4 20 20" />}
    </svg>
  )
}

export function HistoryIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="square" strokeLinejoin="miter" d="M4 5h16v15H4V5Zm3-3h10v3H7V2Z" />
      <path strokeLinecap="square" d="M8 10h8M8 14h8" />
    </svg>
  )
}
