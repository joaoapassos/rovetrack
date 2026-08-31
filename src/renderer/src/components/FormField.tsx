import type { FormFieldProps } from '../types/components'

export function FormField({ id, label, error, children }: FormFieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-[#8b949e]"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1 font-mono text-xs text-red-400">{error}</p>}
    </div>
  )
}
