import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

/** Scrollable creation feed that sticks to the latest result until the user scrolls up. */
export function Feed({ children, scrollKey }: { children: ReactNode; scrollKey: unknown }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const pinnedRef = useRef(true)
  const previousScrollKeyRef = useRef(scrollKey)

  useEffect(() => {
    // Keep the introductory content at the top on first paint (including StrictMode's effect replay).
    if (Object.is(previousScrollKeyRef.current, scrollKey)) return
    previousScrollKeyRef.current = scrollKey
    const el = ref.current
    if (el && pinnedRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [scrollKey])

  return (
    <div
      ref={ref}
      onScroll={(event) => {
        const el = event.currentTarget
        pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      className="relative z-10 min-h-0 flex-1 overflow-y-auto"
    >
      {children}
    </div>
  )
}

/** Prompt attached to a generated result. */
export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/65 bg-card/45 px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">
        <Sparkles className="h-3 w-3 text-modality/75" />
        提示词
      </div>
      <div className="whitespace-pre-wrap break-words text-[13px] leading-6 text-foreground/90">
        {children}
      </div>
    </div>
  )
}
