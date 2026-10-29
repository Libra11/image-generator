import {
  CircleAlert,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { EmptyState } from '@/components/studio/EmptyState'
import { GeneratedImageView } from '@/components/image/GeneratedImageView'
import { Feed, UserBubble } from '@/components/studio/feed'
import { StageHeader } from '@/components/studio/StageHeader'
import { Button } from '@/components/ui/button'
import { formatHistoryTime } from '@/lib/image'
import type { GeneratedImage, HistoryEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ImageStageProps {
  entries: HistoryEntry[]
  isGenerating: boolean
  pendingPrompt: string
  pendingCount: number
  isTauri: boolean
  onImageAction: (image: GeneratedImage, index: number) => void
  onPreview: (entry: HistoryEntry, index: number) => void
  onApplyEntry: (entry: HistoryEntry) => void
  onDeleteEntry: (id: string) => void
  onClearEntries: () => void
  onOpenSettings: () => void
  samples: { prompt: string; title: string }[]
  onUseSample: (prompt: string) => void
  isDragging: boolean
}

function ImageCard({ image, index, onAction, onOpen }: {
  image: GeneratedImage
  index: number
  onAction: () => void
  onOpen: () => void
}) {
  return (
    <figure className="group overflow-hidden rounded-[16px] border border-border/75 bg-card/70 shadow-[var(--shadow-sm)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-modality/35 hover:shadow-[var(--shadow-lg)]">
      <div className="relative">
        <GeneratedImageView
          image={image}
          index={index}
          onAction={onAction}
          onPreview={onOpen}
          imageClassName="mx-auto max-h-[380px] w-full object-contain"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute right-2.5 top-2.5 flex gap-1.5 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <button
            type="button"
            onClick={onAction}
            title={image.sourceType === 'dataUrl' ? '下载图片' : '打开原图'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpen}
            title="放大查看"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-black/45 px-1.5 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-sm">
          #{index + 1}
        </span>
      </div>
      {image.revisedPrompt ? (
        <figcaption className="border-t border-border/60 px-3.5 py-2.5">
          <p className="truncate text-[11px] text-muted-foreground" title={image.revisedPrompt}>
            <span className="text-foreground/60">优化后：</span>
            {image.revisedPrompt}
          </p>
        </figcaption>
      ) : null}
    </figure>
  )
}

export function ImageStage({
  entries,
  isGenerating,
  pendingPrompt,
  pendingCount,
  isTauri,
  onImageAction,
  onPreview,
  onApplyEntry,
  onDeleteEntry,
  onClearEntries,
  onOpenSettings,
  samples,
  onUseSample,
  isDragging,
}: ImageStageProps) {
  const skeletonCount = Math.min(Math.max(pendingCount, 1), 4)
  const isEmpty = entries.length === 0 && !isGenerating

  return (
    <>
      <StageHeader
        icon={ImageIcon}
        title="图像工作台"
        description="用文字与参考图，把灵感变成作品"
        actions={
          entries.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClearEntries}>
              <Trash2 className="h-3.5 w-3.5" />
              清空
            </Button>
          ) : undefined
        }
      >
        {entries.length > 0 ? (
          <span className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-[10px] text-muted-foreground">
            {entries.length} 次生成
          </span>
        ) : null}
      </StageHeader>

      <Feed scrollKey={`${entries.length}-${isGenerating}`}>
        <div className={cn('mx-auto w-full max-w-4xl px-5 py-6 sm:px-6', isEmpty && 'flex min-h-full flex-col')}>
          {!isTauri ? (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.055] px-3.5 py-2.5 text-[11px] leading-5">
              <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="min-w-0 flex-1 text-muted-foreground">
                <span className="font-medium text-amber-600 dark:text-amber-400">网页预览模式</span>
                <span className="mx-2 text-border">·</span>
                生成与下载功能需在桌面应用中使用
              </p>
              <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2.5 text-[11px]" onClick={onOpenSettings}>
                连接设置
              </Button>
            </div>
          ) : null}

          {isEmpty ? (
            <EmptyState
              icon={ImageIcon}
              eyebrow="AI IMAGE STUDIO"
              title="让想象，成为眼前的画面。"
              description="描述主体、场景与光影，或拖入一张参考图。把复杂交给模型，把创意留给自己。"
              samples={samples}
              onUseSample={onUseSample}
            />
          ) : (
            <div className="space-y-6">
              {[...entries].reverse().map((entry, index) => (
                <div
                  key={entry.id}
                  className="animate-rise space-y-2"
                  style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
                >
                  <UserBubble>{entry.prompt || '（无提示词）'}</UserBubble>

                  <div>
                    <div className={cn('grid gap-3', entry.images.length === 1 ? 'w-full max-w-[520px]' : 'grid-cols-2')}>
                      {entry.images.map((image, index) => (
                        <ImageCard
                          key={`${entry.id}-${index}`}
                          image={image}
                          index={index}
                          onAction={() => onImageAction(image, index)}
                          onOpen={() => onPreview(entry, index)}
                        />
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex h-5 max-w-[200px] items-center truncate rounded-md border border-border/70 bg-card/50 px-1.5 font-mono">
                        {entry.model}
                      </span>
                      <span>{formatHistoryTime(entry.createdAt)}</span>
                      <span className="font-mono">{entry.size.replace('x', ' × ')}</span>
                      {entry.sourceImageCount > 0 ? <span>参考图 ×{entry.sourceImageCount}</span> : null}
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => onApplyEntry(entry)}
                        title="复用参数"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        title="删除该条"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {isGenerating ? (
                <div className="animate-rise space-y-2">
                  <UserBubble>{pendingPrompt || '生成中'}</UserBubble>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-modality" />
                      正在请求模型，通常需要 10–60 秒，请保持窗口打开…
                    </div>
                    <div className={cn('grid gap-3', skeletonCount === 1 ? 'w-full max-w-[520px]' : 'grid-cols-2')}>
                      {Array.from({ length: skeletonCount }).map((_, index) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-2xl border border-border bg-card/50 shadow-[var(--shadow-sm)]"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-muted/25">
                            <div className="skeleton-sheen absolute inset-0" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                              <div className="accent-gradient flex h-9 w-9 items-center justify-center rounded-xl opacity-90 shadow-lg">
                                <Sparkles className="h-4 w-4 text-modality-contrast" />
                              </div>
                              <p className="text-[11px] text-muted-foreground">正在绘制第 {index + 1} 张…</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Feed>

      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-modality/60 bg-modality-soft/40 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-2 text-center">
            <ImageIcon className="h-8 w-8 text-modality" />
            <p className="text-sm font-medium">松开以上传参考图</p>
            <p className="text-xs text-muted-foreground">自动进入图生图模式</p>
          </div>
        </div>
      ) : null}
    </>
  )
}
