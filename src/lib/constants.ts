import type { PersistedSettings, SizePreset } from './types'

export const SETTINGS_STORAGE_KEY = 'image-generator.settings'
export const HISTORY_STORAGE_KEY = 'image-generator.history'
export const THEME_STORAGE_KEY = 'image-generator.theme'

export const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export const MAX_SOURCE_IMAGES = 3
export const MAX_HISTORY_ITEMS = 12
export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024
export const TARGET_SOURCE_IMAGE_BYTES = 9 * 1024 * 1024
export const MAX_COMPRESSED_IMAGE_DIMENSION = 2048
export const MAX_REQUEST_IMAGE_DIMENSION = 2048
export const MIN_REQUEST_IMAGE_DIMENSION = 512
export const MIN_COMPRESSED_IMAGE_DIMENSION = 768
export const JPEG_COMPRESSION_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]

export const COMMON_SIZE_PRESETS: SizePreset[] = [
  { label: '方图', value: '1024x1024' },
  { label: '横版', value: '1344x768' },
  { label: '竖版', value: '768x1344' },
  { label: '海报', value: '1024x1536' },
  { label: '封面', value: '1536x1024' },
  { label: '宽屏', value: '1536x864' },
]

export const SAMPLE_PROMPTS: { title: string; prompt: string }[] = [
  {
    title: '江南水乡',
    prompt: '清晨薄雾中的江南水乡，青石板路映着微光，乌篷船缓缓划过，胶片质感，柔和自然光',
  },
  {
    title: '产品海报',
    prompt: '极简产品海报，磨砂玻璃质感的香水瓶，奶油色调，柔光箱打光，留白构图，商业摄影',
  },
  {
    title: '未来城市',
    prompt: '未来主义城市天际线，黄昏时分，体积光穿透云层，电影级构图，高细节，宽画幅',
  },
  {
    title: '角色设定',
    prompt: '一只戴着宇航头盔的橘猫，卡通渲染风格，厚涂质感，白色背景，角色设定图',
  },
]

export const defaultSettings: PersistedSettings = {
  apiKey: '',
  baseUrl: DEFAULT_BASE_URL,
  extraBody: '',
  fontStack: [],
  imageCount: 1,
  negativePrompt: '',
  preserveSourceSize: true,
  rememberLocally: false,
  selectedModel: '',
  size: '1024x1024',
}