import type { ChangeEvent, RefObject } from 'react'
import { useState } from 'react'
import { CircleAlert, ImagePlus, Sparkles, X } from 'lucide-react'

import { ComposerBar } from '@/components/studio/ComposerBar'
import { ChipSelect, ModeSwitch } from '@/components/studio/controls'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MAX_SOURCE_IMAGES } from '@/lib/constants'
import type { SizePreset, TaskMode, UploadedImage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ModelState {
  activeModelId: string
  autoModel: string
  capabilitySummary: string
  error: string
  isLoading: boolean
  onSelectModel: (value: string) => void
  selectableModels: string[]
  selectedModel: string
}

interface SizeState {
  disabled: boolean
  effectiveValue: string
  error: string
  hint: string
  lockedToSource: boolean
  onChange: (value: string) => void
  presets: SizePreset[]
  value: string
}

interface CountState {
  onChange: (value: number) => void
  options: number[]
  value: number
}

interface AdvancedState {
  extraBody: string
  negativePrompt: string
  onExtraBodyChange: (value: string) => void
  onNegativePromptChange: (value: string) => void
}

export interface ImageComposerProps {
  advanced: AdvancedState
  apiReady: boolean
  countState: CountState
  errorMessage: string
  isGenerating: boolean
  modelState: ModelState
  onClearSources: () => void
  onDismissError: () => void
  onOpenSettings: () => void
  onPickFiles: (files: File[]) => void
  onPreserveSourceSizeChange: (value: boolean) => void
  onPromptChange: (value: string) => void
  onRemoveSource: (index: number) => void
  onSourceImageChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
  onTaskModeChange: (mode: TaskMode) => void
  preserveHint: string
  preserveSourceSize: boolean
  prompt: string
  promptRef: RefObject<HTMLTextAreaElement | null>
  sizeState: SizeState
  sourceImages: UploadedImage[]
  statusMessage: string
  taskMode: TaskMode
  requestSize: string
}

export function ImageComposer({
  advanced,
  apiReady,
  countState,
  errorMessage,
  isGenerating,
  modelState,
  onClearSources,
  onDismissError,
  onOpenSettings,
  onPickFiles,
  onPreserveSourceSizeChange,
  onPromptChange,
  onRemoveSource,
  onSourceImageChange,
  onSubmit,
  onTaskModeChange,
  preserveHint,
  preserveSourceSize,
  prompt,
  promptRef,
  sizeState,
  sourceImages,
  statusMessage,
  taskMode,
  requestSize,
}: ImageComposerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const taskLabel = taskMode === 'edit' ? '图生图' : '文生图'
  const presetValues = sizeState.presets.map((preset) => preset.value)
  const sizeSelectValue = presetValues.includes(sizeState.value) ? sizeState.value : 'custom'

  const sizeChip = sizeState.lockedToSource ? (
    <span
      className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card/40 px-2.5 text-[11px] text-muted-foreground"
      title="尺寸跟随首张参考图，可在参数面板调整"
    >
      尺寸 · 跟随参考图
    </span>
  ) : (
    <ChipSelect
      value={sizeSelectValue}
      onChange={(value) => {
        if (value === 'custom') setDrawerOpen(true)
        else sizeState.onChange(value)
      }}
      disabled={sizeState.disabled}
      title={sizeState.disabled ? '当前模型使用固定尺寸' : '输出尺寸'}
      options={[
        ...sizeState.presets.map((preset) => ({
          value: preset.value,
          label: `${preset.label} · ${preset.value.replace('x', '×')}`,
        })),
        { value: 'custom', label: '自定义尺寸…' },
      ]}
    />
  )

  return (
    <ComposerBar
      value={prompt}
      onChange={onPromptChange}
      onSubmit={onSubmit}
      placeholder={taskMode === 'edit' ? '描述想要如何修改这些图片…' : '描述你脑海里的画面：主体、场景、光线、材质、风格…'}
      busy={isGenerating}
      canSubmit={prompt.trim().length > 0}
      submitLabel={`开始${taskLabel}`}
      textareaRef={promptRef}
      status={statusMessage}
      error={errorMessage}
      onDismissError={onDismissError}
      hint={`${taskLabel} · ${countState.value} 张 · ${requestSize || '自动尺寸'}`}
      drawerOpen={drawerOpen}
      onToggleDrawer={() => setDrawerOpen((open) => !open)}
      leading={
        <>
          <ModeSwitch
            value={taskMode}
            onChange={onTaskModeChange}
            options={[
              { value: 'text', label: '文生图', icon: Sparkles },
              { value: 'edit', label: '图生图', icon: ImagePlus },
            ]}
          />
          <label
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground transition-colors hover:border-modality/40 hover:text-foreground"
            title={`添加参考图（最多 ${MAX_SOURCE_IMAGES} 张，也可拖拽或 ⌘V 粘贴）`}
          >
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              multiple
              onChange={onSourceImageChange}
              className="hidden"
            />
            <ImagePlus className="h-3.5 w-3.5" />
          </label>
        </>
      }
      chips={
        <>
          {sizeChip}
          <ChipSelect
            value={String(countState.value)}
            onChange={(value) => countState.onChange(Number(value))}
            title="单次生成数量"
            options={countState.options.map((option) => ({ value: String(option), label: `${option} 张` }))}
          />
        </>
      }
      top={
        sourceImages.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {sourceImages.map((image, index) => (
                <div
                  key={`${image.name}-${index}`}
                  className="group relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted/30"
                >
                  <img src={image.dataUrl} alt={image.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveSource(index)}
                    title="移除参考图"
                    className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {sourceImages.length < MAX_SOURCE_IMAGES ? (
                <label
                  className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input text-muted-foreground transition-colors hover:border-modality/40 hover:text-foreground"
                  title="继续添加"
                >
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? [])
                      if (files.length > 0) onPickFiles(files)
                      event.target.value = ''
                    }}
                    className="hidden"
                  />
                  <ImagePlus className="h-4 w-4" />
                </label>
              ) : null}
            </div>
            <span className="flex-1" />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {sourceImages.length}/{MAX_SOURCE_IMAGES}
            </span>
            <button
              type="button"
              onClick={onClearSources}
              className="text-[11px] text-muted-foreground transition-colors hover:text-destructive"
            >
              清空
            </button>
          </div>
        ) : undefined
      }
      drawer={
        <div className="space-y-5">
          {/* model */}
          <section className="rounded-xl border border-border bg-card/50 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    modelState.isLoading
                      ? 'animate-pulse bg-amber-400'
                      : modelState.error
                        ? 'bg-destructive'
                        : 'bg-emerald-400',
                  )}
                />
                模型
              </span>
              {modelState.capabilitySummary ? (
                <span className="truncate text-[11px] text-muted-foreground" title={modelState.capabilitySummary}>
                  {modelState.capabilitySummary}
                </span>
              ) : null}
            </div>

            <Select
              value={modelState.selectedModel || 'auto'}
              onValueChange={modelState.onSelectModel}
              disabled={modelState.selectableModels.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={modelState.isLoading ? '正在读取账号模型…' : '自动选择（推荐）'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动选择（推荐）</SelectItem>
                {modelState.selectableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="mt-2 truncate text-[11px] text-muted-foreground">
              {modelState.isLoading
                ? '正在读取账号可用模型…'
                : modelState.error
                  ? modelState.error
                  : modelState.activeModelId
                    ? `当前使用 ${modelState.activeModelId}`
                    : '配置 API Key 后自动加载可用模型'}
            </p>
          </section>

          {/* custom size */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label">自定义尺寸</span>
              <span className="font-mono text-[11px] text-muted-foreground">{sizeState.effectiveValue || '自动'}</span>
            </div>
            <input
              value={sizeState.disabled ? '' : sizeState.effectiveValue}
              onChange={(event) => sizeState.onChange(event.target.value)}
              placeholder="例如 1344x768"
              disabled={sizeState.disabled || sizeState.lockedToSource}
              className="field font-mono text-xs"
            />
            <p className={cn('hint', sizeState.error && 'text-destructive')}>{sizeState.hint}</p>
          </section>

          {/* preserve source size */}
          {sourceImages.length > 0 ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/30 px-2.5 py-2">
              <input
                type="checkbox"
                id="preserveSourceSize"
                checked={preserveSourceSize}
                onChange={(event) => onPreserveSourceSizeChange(event.target.checked)}
                disabled={sizeState.disabled}
                className="mt-0.5 h-3.5 w-3.5 accent-[var(--modality)]"
              />
              <div className="min-w-0 space-y-0.5">
                <label htmlFor="preserveSourceSize" className="block cursor-pointer text-xs font-medium">
                  保持首张参考图尺寸
                </label>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{preserveHint}</p>
              </div>
            </div>
          ) : null}

          {/* advanced */}
          <section className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="negative-prompt" className="text-[11px] font-medium text-muted-foreground">
                反向提示词
              </label>
              <textarea
                id="negative-prompt"
                value={advanced.negativePrompt}
                onChange={(event) => advanced.onNegativePromptChange(event.target.value)}
                placeholder="不想出现的内容，例如：低清晰度、文字、水印"
                rows={2}
                className="field resize-none text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="extra-body" className="text-[11px] font-medium text-muted-foreground">
                额外参数 JSON
              </label>
              <textarea
                id="extra-body"
                value={advanced.extraBody}
                onChange={(event) => advanced.onExtraBodyChange(event.target.value)}
                placeholder='{"seed": 42, "watermark": false}'
                rows={2}
                className="field resize-none font-mono text-[11px]"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                会合并进请求参数，可用于 seed、watermark 等扩展字段。
              </p>
            </div>
          </section>

          {!apiReady ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 p-3">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">尚未配置 API Key</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  配置后会自动读取账号可用模型；也可以使用环境变量 DASHSCOPE_API_KEY。
                </p>
                <Button size="sm" variant="outline" onClick={onOpenSettings} className="h-7 px-2.5 text-[11px]">
                  打开设置
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      }
    />
  )
}
