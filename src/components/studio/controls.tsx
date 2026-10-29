import type { LucideIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function ChipSelect({ value, onChange, options, disabled = false, title }: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  title?: string
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        title={title}
        className="h-8 w-auto min-w-0 gap-1.5 rounded-lg border-border bg-card/40 px-2.5 text-[11px] hover:border-modality/35 focus:ring-0 [&>span]:line-clamp-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ModeSwitch<T extends string>({ value, onChange, options, disabled = false }: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon: LucideIcon }[]
  disabled?: boolean
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-border bg-card/40 p-0.5">
      {options.map((option) => {
        const active = value === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all active:scale-95',
              active
                ? 'bg-background text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('h-3 w-3', active && 'text-modality')} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
