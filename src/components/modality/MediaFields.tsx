import { useId, type ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const fieldClass = 'field h-9'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-2"><span className="label">{label}</span>{children}</label>
}

export function Choice({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
