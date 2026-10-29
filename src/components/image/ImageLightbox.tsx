import { ArrowUpRight, Download } from 'lucide-react'

import { GeneratedImageView } from '@/components/image/GeneratedImageView'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GeneratedImage } from '@/lib/types'

interface ImageLightboxProps {
  image: GeneratedImage | null
  index: number
  modelId: string
  onAction: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  prompt: string
}

export function ImageLightbox({
  image,
  index,
  modelId,
  onAction,
  onOpenChange,
  open,
  prompt,
}: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1080px] gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">生成结果预览</DialogTitle>
        <DialogDescription className="sr-only">
          查看第 {index + 1} 张生成结果，可下载或打开原图。
        </DialogDescription>

        {image ? (
          <GeneratedImageView
            image={image}
            index={index}
            onAction={onAction}
            className="max-h-[76vh] bg-black/25"
            imageClassName="mx-auto max-h-[76vh] w-full animate-fade-in object-contain"
          />
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border/70 bg-popover/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-modality-soft px-1.5 py-0.5 font-mono text-[10px] text-modality">
                #{index + 1}
              </span>
              {modelId ? (
                <span className="truncate font-mono text-[10px] text-muted-foreground">{modelId}</span>
              ) : null}
            </div>
            <p className="line-clamp-2 max-w-[620px] text-xs leading-relaxed text-muted-foreground">
              {prompt || '该结果没有保存提示词。'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button variant="primary" size="sm" onClick={onAction}>
              {image?.sourceType === 'dataUrl' ? (
                <>
                  <Download className="h-3.5 w-3.5" />
                  下载原图
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  打开原图
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}