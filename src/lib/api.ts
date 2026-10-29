import { invoke } from '@tauri-apps/api/core'
import { openPath, openUrl } from '@tauri-apps/plugin-opener'
import type { GeneratedImage, GenerateImageResponse, ModelProfileResponse } from './types'

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export interface GenerateImageRequest {
  apiKey: string
  baseUrl: string
  extraBody: string
  imageCount: number
  negativePrompt: string
  prompt: string
  selectedModel: string
  size: string
  sourceImages: string[]
}

export function fetchModelProfile(config: { apiKey: string; baseUrl: string }) {
  return invoke<ModelProfileResponse>('get_model_profile', { request: config })
}

export function requestImages(request: GenerateImageRequest) {
  return invoke<GenerateImageResponse>('generate_images', { request })
}

export function resolveGeneratedImageSrc(image: GeneratedImage) {
  if (image.sourceType === 'file') {
    if (!isTauriRuntime()) return ''
    const filename = image.src.split(/[\\/]/).pop() ?? ''
    const protocol = navigator.userAgent.includes('Windows')
      ? 'http://generated-image.localhost'
      : 'generated-image://localhost'
    return `${protocol}/${encodeURIComponent(filename)}`
  }
  return image.src
}

export async function openGeneratedImage(image: GeneratedImage, index: number) {
  if (image.sourceType === 'file') {
    if (!isTauriRuntime()) {
      throw new Error('本地图片只能在桌面应用中打开。')
    }
    await openPath(image.src)
    return
  }

  if (image.sourceType === 'dataUrl') {
    const link = document.createElement('a')
    link.href = image.src
    link.download = `generated-image-${index + 1}.png`
    link.click()
    return
  }

  if (isTauriRuntime()) {
    await openUrl(image.src)
    return
  }

  window.open(image.src, '_blank', 'noopener,noreferrer')
}