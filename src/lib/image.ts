import {
  JPEG_COMPRESSION_QUALITIES,
  MAX_COMPRESSED_IMAGE_DIMENSION,
  MAX_REQUEST_IMAGE_DIMENSION,
  MAX_SOURCE_IMAGE_BYTES,
  MIN_COMPRESSED_IMAGE_DIMENSION,
  MIN_REQUEST_IMAGE_DIMENSION,
  TARGET_SOURCE_IMAGE_BYTES,
} from './constants'
import type { UploadedImage } from './types'

export function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(sizeInBytes / 1024, 0.1).toFixed(1)} KB`
  }

  return `${(sizeInBytes / 1024 / 1024).toFixed(2)} MB`
}

export function estimateDataUrlSize(dataUrl: string) {
  const [, payload = ''] = dataUrl.split(',', 2)
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

export function formatDimensions(width: number, height: number) {
  return `${width}x${height}`
}

export function parseSizeInput(size: string) {
  const trimmed = size.trim()

  if (!trimmed) {
    return null
  }

  const match = trimmed.match(/^(\d+)\s*[xX*]\s*(\d+)$/)
  if (!match) {
    return null
  }

  const width = Number(match[1])
  const height = Number(match[2])

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return null
  }

  return { width, height }
}

export function fitSizeToAllowedRange(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return null
  }

  let nextWidth = width
  let nextHeight = height

  const scaleDown = Math.min(
    MAX_REQUEST_IMAGE_DIMENSION / nextWidth,
    MAX_REQUEST_IMAGE_DIMENSION / nextHeight,
    1,
  )
  nextWidth = Math.max(1, Math.round(nextWidth * scaleDown))
  nextHeight = Math.max(1, Math.round(nextHeight * scaleDown))

  const scaleUp = Math.max(
    MIN_REQUEST_IMAGE_DIMENSION / nextWidth,
    MIN_REQUEST_IMAGE_DIMENSION / nextHeight,
    1,
  )
  nextWidth = Math.max(1, Math.round(nextWidth * scaleUp))
  nextHeight = Math.max(1, Math.round(nextHeight * scaleUp))

  if (
    nextWidth < MIN_REQUEST_IMAGE_DIMENSION ||
    nextWidth > MAX_REQUEST_IMAGE_DIMENSION ||
    nextHeight < MIN_REQUEST_IMAGE_DIMENSION ||
    nextHeight > MAX_REQUEST_IMAGE_DIMENSION
  ) {
    return null
  }

  return { height: nextHeight, width: nextWidth }
}

export function validateManualSize(size: string) {
  const trimmed = size.trim()
  if (!trimmed) {
    return ''
  }

  const parsed = parseSizeInput(trimmed)
  if (!parsed) {
    return '尺寸格式应为 宽x高，例如 1344x768。'
  }

  if (
    parsed.width < MIN_REQUEST_IMAGE_DIMENSION ||
    parsed.width > MAX_REQUEST_IMAGE_DIMENSION ||
    parsed.height < MIN_REQUEST_IMAGE_DIMENSION ||
    parsed.height > MAX_REQUEST_IMAGE_DIMENSION
  ) {
    return `尺寸宽高都必须在 ${MIN_REQUEST_IMAGE_DIMENSION}-${MAX_REQUEST_IMAGE_DIMENSION}px 之间。`
  }

  return ''
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('无法读取图片内容。'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error('读取图片失败。'))
    reader.readAsDataURL(file)
  })
}

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('无法解析图片内容，请换一张图片重试。'))
    image.src = url
  })
}

async function readImageDimensionsFromFile(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImageElement(objectUrl)
    return {
      height: image.naturalHeight,
      width: image.naturalWidth,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function compressImageToDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImageElement(objectUrl)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('当前环境不支持图片压缩，请先手动压缩后再上传。')
    }

    let width = image.naturalWidth
    let height = image.naturalHeight
    const largestSide = Math.max(width, height)

    if (largestSide > MAX_COMPRESSED_IMAGE_DIMENSION) {
      const scale = MAX_COMPRESSED_IMAGE_DIMENSION / largestSide
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      canvas.width = width
      canvas.height = height
      context.clearRect(0, 0, width, height)
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)

      for (const quality of JPEG_COMPRESSION_QUALITIES) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const processedSize = estimateDataUrlSize(dataUrl)

        if (processedSize <= TARGET_SOURCE_IMAGE_BYTES) {
          return {
            dataUrl,
            originalHeight: image.naturalHeight,
            originalWidth: image.naturalWidth,
            processedHeight: height,
            processedSize,
            processedWidth: width,
          }
        }
      }

      if (Math.max(width, height) <= MIN_COMPRESSED_IMAGE_DIMENSION) {
        break
      }

      const currentLargestSide = Math.max(width, height)
      const scale = Math.max(MIN_COMPRESSED_IMAGE_DIMENSION / currentLargestSide, 0.85)
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }

  throw new Error(
    `参考图 ${file.name} 原始大小 ${formatFileSize(file.size)}，自动压缩后仍超过 10MB，请先手动缩小后再上传。`,
  )
}

export async function prepareSourceImage(file: File): Promise<UploadedImage> {
  if (file.size <= MAX_SOURCE_IMAGE_BYTES) {
    const { height, width } = await readImageDimensionsFromFile(file)
    return {
      dataUrl: await readFileAsDataUrl(file),
      name: file.name,
      originalHeight: height,
      originalSize: file.size,
      originalWidth: width,
      processedHeight: height,
      processedSize: file.size,
      processedWidth: width,
      wasCompressed: false,
    }
  }

  const { dataUrl, originalHeight, originalWidth, processedHeight, processedSize, processedWidth } =
    await compressImageToDataUrl(file)

  return {
    dataUrl,
    name: file.name,
    originalHeight,
    originalSize: file.size,
    originalWidth,
    processedHeight,
    processedSize,
    processedWidth,
    wasCompressed: true,
  }
}

export function formatHistoryTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

export function isEditableElement(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  const tagName = element.tagName.toLowerCase()
  return element.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function getClipboardImageFiles(clipboardData: DataTransfer | null) {
  if (!clipboardData) {
    return []
  }

  return Array.from(clipboardData.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
}