import { invoke } from '@tauri-apps/api/core'
import type { PersistedSettings } from './types'

export type MediaKind = 'video' | 'model3d'
export interface MediaForm {
  model: string
  prompt: string
  image: string
  lastFrame: string
  duration: number
  resolution: string
  ratio: string
  texture: boolean
  textureQuality: string
  geometryQuality: string
}
export interface MediaOutput {
  task_id: string
  task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'UNKNOWN'
  video_url?: string
  code?: string
  message?: string
  results?: { pbr_model_url?: string; base_model_url?: string; rendered_image_url?: string }[]
}
export interface MediaTask {
  output: MediaOutput
  model: string
  prompt: string
  createdAt: string
  baseUrl: string
}
export type MediaWorkspaceProps = {
  settings: PersistedSettings
  onOpenSettings: () => void
  active: boolean
}
export const STATUS_LABELS: Record<MediaOutput['task_status'], string> = {
  PENDING: '排队中', RUNNING: '生成中', SUCCEEDED: '已完成', FAILED: '生成失败', CANCELED: '已取消', UNKNOWN: '任务不存在或已过期',
}
export const isPending = (task: MediaTask | null) => !!task && ['PENDING', 'RUNNING'].includes(task.output.task_status)
export const safeMediaUrl = (url?: string) => {
  if (!url) return undefined
  try { return ['https:', 'http:'].includes(new URL(url).protocol) ? url : undefined } catch { return undefined }
}
export function createMediaTask(form: MediaForm, settings: PersistedSettings) {
  return invoke<{ output: MediaOutput }>('create_media_task', {
    request: { ...form, apiKey: settings.apiKey, baseUrl: settings.baseUrl },
  })
}
export function queryMediaTask(task: MediaTask, apiKey: string) {
  return invoke<{ output: MediaOutput }>('get_media_task', {
    request: { taskId: task.output.task_id, baseUrl: task.baseUrl, apiKey },
  })
}
export function uploadMediaImage(
  file: { filename: string; dataBase64: string },
  model: string,
  settings: PersistedSettings,
) {
  return invoke<string>('upload_media_image', {
    request: { ...file, model, apiKey: settings.apiKey, baseUrl: settings.baseUrl },
  })
}

export function readMediaTasks(kind: MediaKind): MediaTask[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(`image-generator.${kind}.tasks`) || '[]')
    if (!Array.isArray(data)) return []
    return data.filter((t): t is MediaTask => t && typeof t.model === 'string'
      && typeof t.prompt === 'string' && typeof t.baseUrl === 'string' && typeof t.createdAt === 'string'
      && typeof t.output?.task_id === 'string' && Object.hasOwn(STATUS_LABELS, t.output.task_status)).slice(0, 12)
  } catch { return [] }
}
