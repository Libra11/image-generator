import { useState } from 'react'
import { ArrowUpRight, ImageOff, LoaderCircle, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { resolveGeneratedImageSrc } from '@/lib/api'
import type { GeneratedImage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface GeneratedImageViewProps {
  image: GeneratedImage
  index: number
  onAction: () => void
  onPreview?: () => void
  className?: string
  imageClassName?: string
}

export function GeneratedImageView(props: GeneratedImageViewProps) {
  return (
    <GeneratedImageContent
      key={`${props.image.sourceType}:${props.image.src}`}
      {...props}
    />
  )
}

function GeneratedImageContent({
  image,
  index,
  onAction,
  onPreview,
  className,
  imageClassName,
}: GeneratedImageViewProps) {
  const resolvedSrc = resolveGeneratedImageSrc(image)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    resolvedSrc ? 'loading' : 'error',
  )
  const [attempt, setAttempt] = useState(0)

  return (
    <div className={cn('checkerboard relative min-h-[180px] w-full overflow-hidden', className)}>
      {status === 'loading' ? (
        <div className="absolute inset-0 z-10 flex min-h-[180px] items-center justify-center bg-muted/25">
          <div className="skeleton-sheen absolute inset-0" />
          <LoaderCircle className="relative h-5 w-5 animate-spin text-modality" />
        </div>
      ) : null}

      {status !== 'error' ? (
        <button
          type="button"
          onClick={onPreview}
          disabled={!onPreview || status === 'loading'}
          title={onPreview ? '点击放大查看' : undefined}
          aria-label={onPreview ? `放大查看生成结果 ${index + 1}` : undefined}
          className={cn('block w-full', onPreview ? 'cursor-zoom-in' : 'cursor-default')}
        >
          <img
            key={`${resolvedSrc}-${attempt}`}
            src={resolvedSrc}
            alt={`生成结果 ${index + 1}`}
            loading={onPreview ? 'lazy' : 'eager'}
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
            className={cn(
              'block transition-opacity duration-200',
              status === 'ready' ? 'opacity-100' : 'opacity-0',
              imageClassName,
            )}
          />
        </button>
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground">
            <ImageOff className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <p className="text-xs font-medium text-foreground/85">图片暂时无法显示</p>
          <p className="mt-1.5 max-w-[320px] text-[11px] leading-5 text-muted-foreground">
            {image.sourceType === 'url'
              ? '原始链接可能已过期或暂时无法连接，可以重试或打开原图检查。'
              : '图片数据不可用，或本地文件已经被移动、清理。'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-[11px]"
              onClick={() => {
                setAttempt((value) => value + 1)
                setStatus('loading')
              }}
            >
              <RotateCcw className="h-3 w-3" />
              重新加载
            </Button>
            {image.sourceType === 'url' ? (
              <Button size="sm" variant="ghost" className="h-8 px-3 text-[11px]" onClick={onAction}>
                <ArrowUpRight className="h-3 w-3" />
                打开原图
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
