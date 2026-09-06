import { Search, X } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
}

export function SearchInput({
  value,
  className = '',
  onClear,
  title = 'Buscar',
  ...props
}: SearchInputProps): React.JSX.Element {
  const hasValue = typeof value === 'string' && value.length > 0

  return (
    <span className="relative block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f767d]"
        aria-hidden="true"
      />
      <input
        {...props}
        type="search"
        value={value}
        title={title}
        className={`[&::-webkit-search-cancel-button]:appearance-none w-full border border-[#414853] bg-[#161618] py-2.5 pl-10 ${onClear ? 'pr-10' : 'pr-3'} text-sm text-[#f8f8f8] outline-none transition-colors placeholder:text-[#6f767d] focus:border-[#A2ECFB] ${className}`}
      />
      {onClear && hasValue && (
        <button
          type="button"
          title="Limpar busca"
          aria-label="Limpar busca"
          onClick={onClear}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#6f767d] transition-colors hover:text-[#A2ECFB]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </span>
  )
}
