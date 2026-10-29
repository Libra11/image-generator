import type { HistoryEntry, PersistedSettings, ThemeMode } from './types'
import { HISTORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, THEME_STORAGE_KEY } from './constants'

export function loadStoredSettings(): Partial<PersistedSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<PersistedSettings>
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
    return {}
  }
}

export function persistSettings(settings: PersistedSettings) {
  if (!settings.rememberLocally) {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
    return
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage 可能已满或不可用，静默失败
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
    return []
  }
}

export function persistHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage 可能已满或不可用，静默失败
  }
}

export function loadTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

export function persistTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // 忽略存储失败
  }
}