/** Generic CSS families must not be quoted in a font-family list. */
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
])

export const FONT_PRESETS = [
  'Inter',
  'SF Pro Text',
  'PingFang SC',
  'Hiragino Sans GB',
  'Microsoft YaHei',
  'HarmonyOS Sans SC',
  'Noto Sans CJK SC',
  'Source Han Sans SC',
  'LXGW WenKai',
  'Smiley Sans',
  'Georgia',
  'ui-rounded',
]

export function sanitizeFontName(name: string) {
  return name.trim().replace(/["']/g, '')
}

/** Builds a CSS font-family value from an ordered stack; empty stack means "use the app default". */
export function buildFontFamily(stack: string[]) {
  const families = stack
    .map(sanitizeFontName)
    .filter(Boolean)
    .map((name) => (GENERIC_FAMILIES.has(name.toLowerCase()) ? name : `"${name}"`))
  return families.length > 0 ? [...families, 'sans-serif'].join(', ') : ''
}
