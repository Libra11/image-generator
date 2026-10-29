import { useCallback, useEffect, useState } from 'react'

import { ImageWorkspace } from '@/components/image/ImageWorkspace'
import { Model3DWorkspace } from '@/components/model3d/Model3DWorkspace'
import { SettingsDialog } from '@/components/shell/SettingsDialog'
import { SideRail } from '@/components/shell/SideRail'
import { VideoWorkspace } from '@/components/video/VideoWorkspace'
import { defaultSettings } from '@/lib/constants'
import { isTauriRuntime } from '@/lib/api'
import { buildFontFamily } from '@/lib/fonts'
import { loadStoredSettings, loadTheme, persistSettings, persistTheme } from '@/lib/storage'
import type { Modality, PersistedSettings, ThemeMode } from '@/lib/types'
import { cn } from '@/lib/utils'

function readModalityFromHash(): Modality {
  const hash = window.location.hash.replace('#', '').toLowerCase()
  if (hash === 'video') return 'video'
  if (hash === '3d' || hash === 'model3d') return 'model3d'
  return 'image'
}

function modalityHash(modality: Modality) {
  return modality === 'model3d' ? '3d' : modality
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = loadTheme()
    if (stored) return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [modality, setModality] = useState<Modality>(readModalityFromHash)
  const [settings, setSettings] = useState<PersistedSettings>(() => ({
    ...defaultSettings,
    ...loadStoredSettings(),
  }))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    const family = buildFontFamily(settings.fontStack)
    if (family) document.documentElement.style.setProperty('--font-sans', family)
    else document.documentElement.style.removeProperty('--font-sans')
  }, [settings.fontStack])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    persistTheme(theme)
  }, [theme])

  useEffect(() => {
    persistSettings(settings)
  }, [settings])

  useEffect(() => {
    const nextHash = `#${modalityHash(modality)}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }, [modality])

  const updateSetting = useCallback(
    <K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  const apiReady = settings.apiKey.trim().length >= 20
  const isTauri = isTauriRuntime()

  return (
    <div
      className={cn(
        'app-shell flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground',
        `modality-${modality === 'model3d' ? '3d' : modality}`,
      )}
    >
      {isTauri ? <div data-tauri-drag-region className="h-9 shrink-0" /> : null}

      <div className={cn('flex min-h-0 flex-1 gap-3 px-3 pb-3', !isTauri && 'pt-3')}>
        <SideRail
          active={modality}
          onSelect={setModality}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          onOpenSettings={() => setIsSettingsOpen(true)}
          apiReady={apiReady}
        />

        <main className="min-h-0 min-w-0 flex-1">
          <div className={cn('h-full', modality !== 'image' ? 'hidden' : 'animate-fade-in')}>
            <ImageWorkspace
              settings={settings}
              onChange={updateSetting}
              onOpenSettings={() => setIsSettingsOpen(true)}
              active={modality === 'image'}
            />
          </div>

          <div className={cn('h-full', modality !== 'video' ? 'hidden' : 'animate-fade-in')}>
            <VideoWorkspace
              settings={settings}
              onOpenSettings={() => setIsSettingsOpen(true)}
              active={modality === 'video'}
            />
          </div>
          <div className={cn('h-full', modality !== 'model3d' ? 'hidden' : 'animate-fade-in')}>
            <Model3DWorkspace
              settings={settings}
              onOpenSettings={() => setIsSettingsOpen(true)}
              active={modality === 'model3d'}
            />
          </div>
        </main>
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onChange={updateSetting}
      />
    </div>
  )
}

export default App
