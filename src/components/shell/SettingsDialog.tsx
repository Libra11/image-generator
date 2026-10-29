import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Link2, Settings2, ShieldCheck, Sparkles, Type } from 'lucide-react'

import { FontSettingsSection } from '@/components/shell/FontSettingsSection'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DEFAULT_BASE_URL } from '@/lib/constants'
import type { PersistedSettings } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: PersistedSettings
  onChange: <K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]) => void
}

type SettingsSection = 'api' | 'font'

const SECTIONS: { id: SettingsSection; label: string; hint: string; icon: typeof KeyRound }[] = [
  { id: 'api', label: 'API 连接', hint: 'Key 与接入地址', icon: KeyRound },
  { id: 'font', label: '界面字体', hint: '自定义字体栈', icon: Type },
]

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-modality/40',
        checked ? 'accent-gradient border-transparent' : 'border-input bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute left-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export function SettingsDialog({ open, onOpenChange, settings, onChange }: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>('api')
  const [showKey, setShowKey] = useState(false)
  const apiReady = settings.apiKey.trim().length >= 20

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[560px] max-w-[720px] flex-col overflow-hidden">
        <DialogHeader>
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-modality-soft">
            <Settings2 className="h-4 w-4 text-modality" />
          </div>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>API 连接与界面外观，修改即时生效，三个工作台共用。</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-5">
          <nav className="flex w-36 shrink-0 flex-col gap-1">
            {SECTIONS.map((item) => {
              const Icon = item.icon
              const isActive = section === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'bg-modality-soft text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    <Icon className={cn('h-3.5 w-3.5', isActive && 'text-modality')} />
                    {item.label}
                  </span>
                  <span className="pl-[22px] text-[10px] text-muted-foreground/80">{item.hint}</span>
                </button>
              )
            })}
          </nav>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto border-l border-border/60 pl-5 pr-1">
            {section === 'api' ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="api-key" className="label">
                      API Key
                    </label>
                    <span
                      className={cn(
                        'text-[11px]',
                        apiReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                      )}
                    >
                      {apiReady ? '已填写' : '必填'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="api-key"
                      type={showKey ? 'text' : 'password'}
                      value={settings.apiKey}
                      onChange={(event) => onChange('apiKey', event.target.value)}
                      placeholder="sk-..."
                      spellCheck={false}
                      autoComplete="off"
                      className="field pr-10 font-mono text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((current) => !current)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="hint">
                    也可以留空，改用环境变量 <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">DASHSCOPE_API_KEY</code>。
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="base-url" className="label">
                    Base URL
                  </label>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="base-url"
                      value={settings.baseUrl}
                      onChange={(event) => onChange('baseUrl', event.target.value)}
                      placeholder={DEFAULT_BASE_URL}
                      spellCheck={false}
                      className="field pl-8 font-mono text-[12px]"
                    />
                  </div>
                  <p className="hint">使用与 API Key 相同地域的地址，应用自动选择各工作台对应的生成接口。</p>
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[13px] font-medium">
                        <ShieldCheck className="h-3.5 w-3.5 text-modality" />
                        记住设置
                      </div>
                      <p className="hint max-w-[320px]">
                        将共用 API Key 与连接设置、图像参数保存在本机 localStorage，重启后自动带回。Key 仅向配置的服务发送鉴权请求。
                      </p>
                    </div>
                    <Switch
                      checked={settings.rememberLocally}
                      onChange={(checked) => onChange('rememberLocally', checked)}
                      label="记住设置"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3.5 py-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-modality" />
                  <p className="hint flex-1">
                    已用于图片生成的 Key 可以继续使用。三个工作台一起使用时请选择北京地域，并在百炼控制台开通 Tripo；同一 Key 不代表已开通所有模型。
                  </p>
                </div>
              </div>
            ) : (
              <FontSettingsSection settings={settings} onChange={onChange} />
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-border/60 pt-4">
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
