import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FONT_PRESETS, buildFontFamily, sanitizeFontName } from '@/lib/fonts'
import type { PersistedSettings } from '@/lib/types'

interface FontSettingsSectionProps {
  settings: PersistedSettings
  onChange: <K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]) => void
}

export function FontSettingsSection({ settings, onChange }: FontSettingsSectionProps) {
  const [draft, setDraft] = useState('')
  const stack = settings.fontStack
  const previewFamily = buildFontFamily(stack) || undefined

  function setStack(next: string[]) {
    onChange('fontStack', next)
  }

  function add(name: string) {
    const cleaned = sanitizeFontName(name)
    if (!cleaned || stack.some((item) => item.toLowerCase() === cleaned.toLowerCase())) return
    setStack([...stack, cleaned])
    setDraft('')
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...stack]
    const [item] = next.splice(index, 1)
    if (item === undefined) return
    next.splice(index + delta, 0, item)
    setStack(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="label">界面字体</p>
        <button
          type="button"
          onClick={() => setStack([])}
          disabled={stack.length === 0}
          className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" />
          恢复默认
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4" style={previewFamily ? { fontFamily: previewFamily } : undefined}>
        <p className="text-sm leading-relaxed">敏捷的棕色狐狸跳过懒狗。The quick brown fox jumps over the lazy dog. 0123456789</p>
        <p className="mt-1.5 text-xs text-muted-foreground">图像 · 视频 · 3D — 实时预览当前字体栈</p>
      </div>

      {stack.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
          未自定义字体，正在使用默认字体栈（Inter / PingFang SC / 系统字体）
        </p>
      ) : (
        <ol className="space-y-1.5">
          {stack.map((font, index) => (
            <li key={font} className="flex items-center gap-1 rounded-xl border border-border bg-card/50 px-3 py-2">
              <span className="w-5 shrink-0 text-center font-mono text-[10px] text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm" style={{ fontFamily: buildFontFamily([font]) }}>
                {font}
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                title="上移"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === stack.length - 1}
                title="下移"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setStack(stack.filter((_, i) => i !== index))}
                title="移除"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add(draft)
        }}
      >
        <input
          className="field h-9 flex-1 text-sm"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入字体名称，如 LXGW WenKai / 思源黑体"
        />
        <Button type="submit" size="sm" className="h-9" disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" />
          添加
        </Button>
      </form>

      <div>
        <p className="label mb-2">常用字体</p>
        <div className="flex flex-wrap gap-1.5">
          {FONT_PRESETS
            .filter((name) => !stack.some((item) => item.toLowerCase() === name.toLowerCase()))
            .map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => add(name)}
                style={{ fontFamily: buildFontFamily([name]) }}
                className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-modality/40 hover:bg-modality-soft hover:text-foreground"
              >
                {name}
              </button>
            ))}
        </div>
      </div>

      <p className="hint">
        可以添加多个字体，系统按顺序使用第一个已安装的字体；名称需与系统中的一致。等宽字体（代码、任务 ID）不受影响。
      </p>
    </div>
  )
}
