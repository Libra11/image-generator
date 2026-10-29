import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { ArrowUp, CircleAlert, LoaderCircle, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComposerBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  busy: boolean
  canSubmit: boolean
  submitLabel: string
  maxLength?: number
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  /** left-most slot in the chips row, e.g. mode switch */
  leading?: ReactNode
  /** parameter chips/selects */
  chips?: ReactNode
  /** contextual area above the textarea (attachments, url fields) */
  top?: ReactNode
  /** settings drawer content; omitted → no toggle */
  drawer?: ReactNode
  drawerOpen: boolean
  onToggleDrawer: () => void
  /** right-aligned mono summary in the chips row */
  hint?: string
  /** transient info pill above the bar */
  status?: string
  /** error pill above the bar (takes precedence over status) */
  error?: string
  onDismissError?: () => void
}

export function ComposerBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  busy,
  canSubmit,
  submitLabel,
  maxLength,
  textareaRef,
  leading,
  chips,
  top,
  drawer,
  drawerOpen,
  onToggleDrawer,
  hint,
  status,
  error,
  onDismissError,
}: ComposerBarProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const fit = () => {
      // hidden workspace (display:none) reports zero metrics — keep last height
      if (el.offsetParent === null) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 168)}px`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      if (!busy) onSubmit()
    }
  }

  return (
    <div className="relative z-20 shrink-0 px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
      <div className="mx-auto w-full max-w-4xl space-y-2.5">
        {error ? (
          <div role="alert" className="pointer-events-auto flex items-start gap-2 rounded-xl border border-destructive/25 bg-popover/95 px-3.5 py-2.5 text-xs text-destructive shadow-[var(--shadow-lg)] backdrop-blur-xl animate-fade-up">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 leading-relaxed">{error}</span>
            {onDismissError ? (
              <button type="button" onClick={onDismissError} aria-label="关闭错误提示" className="text-destructive/70 transition-colors hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : status ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-modality/20 bg-popover/95 px-3.5 py-2.5 text-[11px] leading-relaxed text-foreground/80 shadow-[var(--shadow-md)] backdrop-blur-xl animate-fade-up">
            <Sparkles className="h-3 w-3 shrink-0 text-modality" />
            {status}
          </div>
        ) : null}

        <div className="pointer-events-auto overflow-hidden rounded-[20px] border border-border/90 bg-popover/95 shadow-[var(--shadow-lg)] backdrop-blur-2xl transition-[border-color,box-shadow] duration-300 focus-within:border-modality/40 focus-within:shadow-[var(--shadow-xl)]">
          {top ? <div className="border-b border-border/60 bg-muted/15 px-3.5 py-3">{top}</div> : null}
          {drawer ? (
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                drawerOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="min-h-0 overflow-hidden" inert={!drawerOpen}>
                <div className="max-h-[42vh] overflow-y-auto border-b border-border/60 px-4 py-4">
                  {drawer}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-modality" />
              描述你的创意
            </span>
            {maxLength ? (
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                {value.length} / {maxLength}
              </span>
            ) : (
              <span className="hidden font-mono text-[10px] text-muted-foreground/50 sm:inline">PROMPT</span>
            )}
          </div>
          <textarea
            ref={(el) => {
              innerRef.current = el
              if (textareaRef) textareaRef.current = el
            }}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            aria-label="创作提示词"
            className="max-h-40 min-h-[62px] w-full resize-none bg-transparent px-4 pb-2 pt-2 text-[14px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/55"
          />

          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/55 bg-muted/15 px-3 py-2.5">
            {leading}
            {chips}
            <span className="min-w-1 flex-1" />
            {hint ? <span className="mr-1 hidden font-mono text-[10px] text-muted-foreground/60 2xl:inline">{hint}</span> : null}
            {drawer ? (
              <button
                type="button"
                onClick={onToggleDrawer}
                aria-expanded={drawerOpen}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] transition-all duration-200 active:scale-95',
                  drawerOpen
                    ? 'border-modality/35 bg-modality-soft text-foreground'
                    : 'border-border/80 bg-card/35 text-muted-foreground hover:border-modality/30 hover:text-foreground',
                )}
              >
                <SlidersHorizontal className="h-3 w-3" />
                参数
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy || !canSubmit}
              title={`${submitLabel}（⌘ / Ctrl + Enter）`}
              className="accent-gradient ml-1 flex h-9 min-w-[88px] shrink-0 items-center justify-center gap-2 rounded-[10px] px-3.5 text-xs font-medium text-modality-contrast shadow-[var(--shadow-sm)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-[var(--shadow-md)] hover:brightness-105 active:translate-y-0 active:scale-[0.97] active:duration-75 disabled:pointer-events-none disabled:opacity-40"
            >
              {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.2} />}
              {busy ? '生成中' : '生成'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
