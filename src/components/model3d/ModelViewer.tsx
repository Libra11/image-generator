import '@google/model-viewer'
import { createElement, useEffect, useRef, useState } from 'react'
import type { ModelViewerElement } from '@google/model-viewer'

export function ModelViewer({ src }: { src: string }) {
  const ref = useRef<ModelViewerElement>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const element = ref.current
    const failed = () => setError(true)
    const loaded = () => setError(false)
    element?.addEventListener('error', failed)
    element?.addEventListener('load', loaded)
    return () => {
      element?.removeEventListener('error', failed)
      element?.removeEventListener('load', loaded)
    }
  }, [])
  return <div className="relative h-[430px] w-full rounded-2xl bg-secondary/40">
    {createElement('model-viewer', {
      ref, src, alt: '生成的 3D 模型，可拖拽旋转、滚轮缩放',
      'camera-controls': true, 'auto-rotate': true, 'shadow-intensity': '1',
      style: { width: '100%', height: '100%' },
    })}
    {error && <p role="alert" className="absolute bottom-4 left-4 right-4 rounded-xl bg-background p-3 text-sm">模型预览加载失败，链接可能已过期或不允许跨域访问。可尝试打开 GLB 链接下载。</p>}
  </div>
}
