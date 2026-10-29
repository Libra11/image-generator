import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function StageHeader({ icon: Icon, title, description, children, actions }: {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="relative z-10 flex min-h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-card/35 px-5 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-modality/10 bg-modality-soft text-modality">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.015em] text-foreground">{title}</h2>
            {children}
          </div>
          {description ? <p className="mt-1 hidden truncate text-[11px] text-muted-foreground sm:block">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
