import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, Command, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

interface Sample {
  title: string
  prompt: string
}

const SAMPLE_DESCRIPTIONS: Record<string, string> = {
  江南水乡: '薄雾、乌篷船与胶片质感',
  产品海报: '柔光、留白与商业摄影',
  未来城市: '黄昏天际线与电影感光影',
  角色设定: '宇航橘猫与厚涂插画风',
  宇航橘猫: '电影光影与失重场景',
  赛博雨夜: '霓虹倒影与缓慢跟随镜头',
  漂浮小岛: '低多边形与梦幻配色',
  复古机器人: '做旧金属与圆润机械造型',
}

export function EmptyState({ icon: Icon, eyebrow, title, description, samples, onUseSample }: {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  samples: Sample[]
  onUseSample: (prompt: string) => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center py-8 animate-fade-up">
      <div className="text-center">
        <div className="relative mx-auto mb-5 h-14 w-14">
          <div className="absolute -inset-5 rounded-full bg-modality/12 blur-2xl" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] border border-modality/15 bg-card/85 shadow-[var(--shadow-md)]">
            <div className="absolute inset-0 rounded-[18px] bg-linear-to-br from-modality/12 to-transparent" />
            <Icon className="relative h-6 w-6 text-modality" strokeWidth={1.6} />
          </div>
          <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-modality/65 ring-4 ring-background/60" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-modality">
          <Sparkles className="h-3 w-3" />
          {eyebrow}
        </div>
        <h2 className="mt-3 text-balance text-[27px] font-semibold leading-[1.25] tracking-[-0.04em] text-foreground sm:text-[32px]">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-[480px] text-[13px] leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {samples.length > 0 ? (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
            <p className="text-xs font-medium text-foreground/85">从一个灵感开始</p>
            <p className="text-[10px] text-muted-foreground/80">点击卡片，自动填入提示词</p>
          </div>
          <div className={cn('grid gap-2.5', samples.length > 3 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
            {samples.map((sample, index) => (
              <button
                key={sample.title}
                type="button"
                onClick={() => onUseSample(sample.prompt)}
                className="group relative min-h-[94px] overflow-hidden rounded-xl border border-border/80 bg-card/55 p-3.5 text-left shadow-[var(--shadow-2xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-modality/35 hover:bg-card/90 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-modality/35"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-wider text-modality/75">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/45 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-modality" />
                </div>
                <p className="mt-2 text-[13px] font-medium text-foreground transition-colors group-hover:text-modality">
                  {sample.title}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {SAMPLE_DESCRIPTIONS[sample.title] ?? '探索一种全新的创意表达'}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/75">
        <Command className="h-3 w-3" />
        <span>输入创意后，按</span>
        <kbd className="rounded-md border border-border/80 bg-card/60 px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground shadow-[var(--shadow-2xs)]">⌘ / Ctrl + Enter</kbd>
        <span>快速生成</span>
      </div>
    </div>
  )
}
