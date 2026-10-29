export type ImageSourceType = 'dataUrl' | 'file' | 'url'

export type Modality = 'image' | 'video' | 'model3d'

export type TaskMode = 'text' | 'edit'

export type ThemeMode = 'dark' | 'light'

export interface PersistedSettings {
  apiKey: string
  baseUrl: string
  extraBody: string
  fontStack: string[]
  imageCount: number
  negativePrompt: string
  preserveSourceSize: boolean
  rememberLocally: boolean
  selectedModel: string
  size: string
}

export interface FormState extends PersistedSettings {
  prompt: string
}

export interface UploadedImage {
  dataUrl: string
  name: string
  originalHeight: number
  originalSize: number
  originalWidth: number
  processedHeight: number
  processedSize: number
  processedWidth: number
  wasCompressed: boolean
}

export interface GeneratedImage {
  revisedPrompt?: string | null
  sourceType: ImageSourceType
  src: string
}

export interface GenerateImageResponse {
  images: GeneratedImage[]
  model?: string | null
  requestId?: string | null
  supportedModels?: string[]
  taskType?: string | null
}

export interface ModelCapability {
  id: string
  capabilitySummary: string
  maxImageCount: number
  supportsCustomSize: boolean
  supportsImageEdit: boolean
  supportsTextToImage: boolean
}

export interface ModelProfileResponse {
  imageEditModel?: string | null
  imageEditModels: string[]
  models: ModelCapability[]
  supportedModels: string[]
  textToImageModel?: string | null
  textToImageModels: string[]
}

export interface HistoryEntry {
  id: string
  createdAt: string
  images: GeneratedImage[]
  imageCount: number
  model: string
  negativePrompt: string
  prompt: string
  size: string
  sourceImageCount: number
  taskType: string
}

export interface SizePreset {
  label: string
  value: string
}