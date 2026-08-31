import type { ActionButtonProps } from '../types/components'

const tones = {
  primary: 'border-[#A2ECFB] bg-[#A2ECFB] text-[#1b1b1f] hover:bg-[#8bd6e5]',
  secondary: 'border-[#414853] bg-[#222222] text-[#f8f8f8] hover:border-[#A2ECFB]',
  warning: 'border-amber-400 bg-[#222222] text-amber-400 hover:bg-amber-400/10',
  danger: 'border-red-400 bg-[#222222] text-red-400 hover:bg-red-400/10'
} as const

export function ActionButton({
  tone = 'secondary',
  compact = false,
  className = '',
  type = 'button',
  ...props
}: ActionButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={`border font-bold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'px-3 py-2 text-[10px]' : 'w-full py-3 text-xs tracking-[0.16em]'} ${tones[tone]} ${className}`}
      {...props}
    />
  )
}
