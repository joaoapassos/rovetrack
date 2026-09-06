import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  id?: string
  value: string
  options: readonly SelectOption[]
  title: string
  disabled?: boolean
  placeholder?: string
  className?: string
  onValueChange: (value: string) => void
}

export function Select({
  id,
  value,
  options,
  title,
  disabled,
  placeholder,
  className = '',
  onValueChange
}: SelectProps): React.JSX.Element {
  return (
    <SelectPrimitive.Root value={value} disabled={disabled} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        title={title}
        aria-label={title}
        className={`flex w-full items-center justify-between gap-3 border border-[#414853] bg-[#161618] px-3 py-2.5 text-left text-sm text-[#f8f8f8] outline-none transition-colors hover:border-[#6f767d] focus:border-[#A2ECFB] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#a0a4a8]" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-[100] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden border border-[#414853] bg-[#222222] text-[#f8f8f8] shadow-2xl"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                title={`Selecionar ${option.label}`}
                className="relative flex cursor-pointer select-none items-center py-2.5 pl-9 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-[#32363f] data-[highlighted]:text-[#A2ECFB]"
              >
                <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4 text-[#A2ECFB]" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
