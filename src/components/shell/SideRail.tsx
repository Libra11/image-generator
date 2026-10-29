import { Cuboid, Image as ImageIcon, Moon, Settings, Sparkles, Sun, Video } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Modality, ThemeMode } from '@/lib/types'

interface NavItem {
  id: Modality
  label: string
  hint: string
  icon: typeof ImageIcon
  accentClass: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'image', label: '图像创作', hint: '文字与图片，自由生成', icon: ImageIcon, accentClass: 'modality-image' },
  { id: 'video', label: '视频生成', hint: '让静态灵感动起来', icon: Video, accentClass: 'modality-video' },
  { id: 'model3d', label: '3D 模型', hint: '构建立体创意', icon: Cuboid, accentClass: 'modality-3d' },
]

interface SideRailProps {
  active: Modality
  onSelect: (modality: Modality) => void
  theme: ThemeMode
  onToggleTheme: () => void
  onOpenSettings: () => void
  apiReady: boolean
}

export function SideRail({ active, onSelect, theme, onToggleTheme, onOpenSettings, apiReady }: SideRailProps) {
  return (
    <aside className="z-20 flex w-[76px] shrink-0 flex-col rounded-[22px] border border-border/70 bg-sidebar/75 p-3 shadow-[var(--shadow-sm)] backdrop-blur-xl xl:w-[208px]">
      <div className="flex h-11 items-center justify-center gap-2.5 px-1 xl:justify-start">
        <div className="group relative shrink-0">
          <div className="accent-gradient flex h-10 w-10 items-center justify-center rounded-[13px] shadow-[var(--shadow-md)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-3 group-hover:scale-105">
            <Sparkles className="h-[18px] w-[18px] text-modality-contrast" strokeWidth={2.2} />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-[13px] bg-modality/35 blur-xl" />
        </div>
        <div className="hidden min-w-0 xl:block">
          <p className="text-[15px] font-semibold tracking-[-0.025em] text-foreground">AI Studio</p>
          <p className="mt-0.5 text-[10px] tracking-wide text-muted-foreground">多模态创作工作台</p>
        </div>
      </div>

      <div className="mb-2 mt-7 hidden px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70 xl:block">
        创作空间
      </div>
      <div className="mx-auto mb-3 mt-6 h-px w-7 bg-border xl:hidden" />

      <nav aria-label="创作类型" className="flex flex-1 flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              title={`${item.label} · ${item.hint}`}
              className={cn(
                'group relative flex h-14 w-full items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.97] xl:h-[64px] xl:justify-start xl:gap-3 xl:px-3',
                item.accentClass,
                isActive
                  ? 'bg-modality-soft text-foreground'
                  : 'text-muted-foreground hover:bg-accent/55 hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-full bg-modality xl:block" />
              ) : null}
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors',
                  isActive ? 'bg-background/75 text-modality shadow-[var(--shadow-xs)]' : 'group-hover:bg-background/45',
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="hidden min-w-0 text-left xl:block">
                <span className="block text-[13px] font-medium leading-5">{item.label}</span>
                <span className={cn('mt-0.5 block truncate text-[10px]', isActive ? 'text-muted-foreground' : 'text-muted-foreground/75')}>
                  {item.hint}
                </span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-4 space-y-1 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          className="flex h-10 w-full items-center justify-center gap-3 rounded-xl text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground xl:justify-start xl:px-3"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          <span className="hidden text-xs xl:inline">{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          title={apiReady ? '设置 · 服务已配置' : '设置 · 尚未配置 API Key'}
          aria-label={apiReady ? '设置，服务已配置' : '设置，尚未配置 API Key'}
          className="relative flex h-10 w-full items-center justify-center gap-3 rounded-xl text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground xl:justify-start xl:px-3"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="hidden text-xs xl:inline">偏好设置</span>
          <span
            className={cn(
              'absolute right-[15px] top-2 h-1.5 w-1.5 rounded-full ring-2 ring-sidebar xl:static xl:ml-auto xl:ring-0',
              apiReady ? 'bg-emerald-500' : 'bg-amber-500',
            )}
          />
        </button>
        <p className="hidden px-3 pb-1 pt-3 text-[10px] text-muted-foreground/65 xl:block">
          让灵感，自由发生。
        </p>
      </div>
    </aside>
  )
}
