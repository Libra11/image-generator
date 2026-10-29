import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ImageComposer } from '@/components/image/ImageComposer'
import { ImageLightbox } from '@/components/image/ImageLightbox'
import { ImageStage } from '@/components/image/ImageStage'
import { Ambient } from '@/components/studio/Ambient'
import { fetchModelProfile, isTauriRuntime, openGeneratedImage, requestImages } from '@/lib/api'
import {
  MAX_HISTORY_ITEMS,
  MAX_SOURCE_IMAGES,
  MAX_REQUEST_IMAGE_DIMENSION,
  MIN_REQUEST_IMAGE_DIMENSION,
  COMMON_SIZE_PRESETS,
  SAMPLE_PROMPTS,
} from '@/lib/constants'
import {
  fitSizeToAllowedRange,
  formatDimensions,
  getClipboardImageFiles,
  isEditableElement,
  parseSizeInput,
  prepareSourceImage,
  validateManualSize,
} from '@/lib/image'
import { loadHistory, persistHistory } from '@/lib/storage'
import type {
  GeneratedImage,
  HistoryEntry,
  ModelProfileResponse,
  PersistedSettings,
  TaskMode,
  UploadedImage,
} from '@/lib/types'

type SettingChange = <K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]) => void

interface ImageWorkspaceProps {
  settings: PersistedSettings
  onChange: SettingChange
  onOpenSettings: () => void
  active: boolean
}

export function ImageWorkspace({ settings, onChange, onOpenSettings, active }: ImageWorkspaceProps) {
  const [prompt, setPrompt] = useState('')
  const [taskMode, setTaskMode] = useState<TaskMode>('text')
  const [sourceImages, setSourceImages] = useState<UploadedImage[]>([])
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => loadHistory())
  const [modelProfile, setModelProfile] = useState<ModelProfileResponse | null>(null)
  const [isLoadingModelProfile, setIsLoadingModelProfile] = useState(false)
  const [modelProfileError, setModelProfileError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState('')
  const [preview, setPreview] = useState<{ entry: HistoryEntry; index: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  const isTauri = isTauriRuntime()
  const taskLabel = sourceImages.length > 0 ? '图生图' : '文生图'
  const canFetchModelProfile =
    isTauri && settings.baseUrl.trim().length > 0 && settings.apiKey.trim().length >= 20

  useEffect(() => {
    persistHistory(historyEntries)
  }, [historyEntries])

  useEffect(() => {
    if (!canFetchModelProfile) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setIsLoadingModelProfile(true)
      setModelProfileError('')

      try {
        const response = await fetchModelProfile({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
        })
        if (!cancelled) setModelProfile(response)
      } catch (error) {
        if (!cancelled) {
          setModelProfile(null)
          setModelProfileError(error instanceof Error ? error.message : String(error))
        }
      } finally {
        if (!cancelled) setIsLoadingModelProfile(false)
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [canFetchModelProfile, settings.apiKey, settings.baseUrl])

  const modelCapabilityMap = useMemo(
    () => new Map((modelProfile?.models ?? []).map((model) => [model.id, model])),
    [modelProfile?.models],
  )

  const currentAutoModel =
    sourceImages.length > 0 ? modelProfile?.imageEditModel : modelProfile?.textToImageModel
  const currentSelectableModels =
    sourceImages.length > 0 ? modelProfile?.imageEditModels ?? [] : modelProfile?.textToImageModels ?? []
  const effectiveSelectedModel = currentSelectableModels.includes(settings.selectedModel)
    ? settings.selectedModel
    : ''
  const currentActiveModelId = effectiveSelectedModel || currentAutoModel || ''
  const currentModelCapability = currentActiveModelId
    ? modelCapabilityMap.get(currentActiveModelId) ?? null
    : null
  const effectiveImageCount = Math.min(settings.imageCount, currentModelCapability?.maxImageCount ?? 1)
  const imageCountOptions = Array.from(
    { length: Math.max(currentModelCapability?.maxImageCount ?? 1, 1) },
    (_, index) => index + 1,
  )
  const isSizeDisabled = currentModelCapability ? !currentModelCapability.supportsCustomSize : false
  const primarySourceImage = sourceImages[0] ?? null
  const sourceOriginalSize = primarySourceImage
    ? formatDimensions(primarySourceImage.originalWidth, primarySourceImage.originalHeight)
    : ''
  const constrainedSourceDimensions = primarySourceImage
    ? fitSizeToAllowedRange(primarySourceImage.originalWidth, primarySourceImage.originalHeight)
    : null
  const constrainedSourceSize = constrainedSourceDimensions
    ? formatDimensions(constrainedSourceDimensions.width, constrainedSourceDimensions.height)
    : ''
  const sourceProcessedSize = primarySourceImage
    ? formatDimensions(primarySourceImage.processedWidth, primarySourceImage.processedHeight)
    : ''
  const sourceSizeNeedsAdjustment =
    Boolean(sourceOriginalSize) &&
    Boolean(constrainedSourceSize) &&
    sourceOriginalSize !== constrainedSourceSize
  const shouldPreserveSourceSize =
    sourceImages.length > 0 &&
    settings.preserveSourceSize &&
    !isSizeDisabled &&
    Boolean(constrainedSourceDimensions)
  const effectiveRequestSize = shouldPreserveSourceSize ? constrainedSourceSize : settings.size
  const manualSizeError =
    !shouldPreserveSourceSize && !isSizeDisabled ? validateManualSize(settings.size) : ''
  const availableSizePresets = useMemo(
    () =>
      COMMON_SIZE_PRESETS.filter((preset) => {
        const parsed = parseSizeInput(preset.value)
        return (
          !isSizeDisabled &&
          !shouldPreserveSourceSize &&
          parsed !== null &&
          parsed.width >= MIN_REQUEST_IMAGE_DIMENSION &&
          parsed.width <= MAX_REQUEST_IMAGE_DIMENSION &&
          parsed.height >= MIN_REQUEST_IMAGE_DIMENSION &&
          parsed.height <= MAX_REQUEST_IMAGE_DIMENSION
        )
      }),
    [isSizeDisabled, shouldPreserveSourceSize],
  )

  const sizeHint = shouldPreserveSourceSize
    ? sourceSizeNeedsAdjustment
      ? `已按比例锁定为 ${constrainedSourceSize}（原图 ${sourceOriginalSize} 超出接口范围）`
      : `已锁定为 ${constrainedSourceSize}，跟随首张参考图`
    : isSizeDisabled
      ? '当前模型不支持自定义尺寸，将使用模型默认值'
      : manualSizeError || `支持 ${MIN_REQUEST_IMAGE_DIMENSION}–${MAX_REQUEST_IMAGE_DIMENSION}px 自定义，可直接输入宽 × 高`

  const preserveHint = !primarySourceImage
    ? '上传参考图后会自动读取首张图片尺寸。'
    : isSizeDisabled
      ? '当前模型不支持手动控制尺寸。'
      : !constrainedSourceDimensions
        ? `首张参考图 ${sourceOriginalSize} 比例过于极端，无法适配到接口允许范围。`
        : primarySourceImage.wasCompressed && sourceProcessedSize !== sourceOriginalSize
          ? sourceSizeNeedsAdjustment
            ? `原图 ${sourceOriginalSize} 超范围，请求尺寸 ${constrainedSourceSize}；上传件已压缩为 ${sourceProcessedSize}。`
            : `将请求原图尺寸 ${sourceOriginalSize}；上传件已压缩为 ${sourceProcessedSize}。`
          : sourceSizeNeedsAdjustment
            ? `原图 ${sourceOriginalSize} 超范围，将按比例请求 ${constrainedSourceSize}。`
            : `将请求首张参考图尺寸 ${sourceOriginalSize}。`

  const applySourceFiles = useCallback(
    async (incomingFiles: File[], mode: 'replace' | 'append' = 'replace') => {
      const currentImages = mode === 'append' ? sourceImages : []
      const availableSlots = Math.max(MAX_SOURCE_IMAGES - currentImages.length, 0)

      if (mode === 'append' && availableSlots === 0) {
        setErrorMessage(`最多只能保留 ${MAX_SOURCE_IMAGES} 张参考图，请先清空后再粘贴。`)
        return
      }

      const normalizedFiles = incomingFiles.map((file, index) => {
        if (file.name.trim()) {
          return file
        }

        const extension = file.type.replace('image/', '') || 'png'
        return new File([file], `pasted-image-${Date.now()}-${index + 1}.${extension}`, {
          lastModified: file.lastModified,
          type: file.type,
        })
      })

      const nextFiles = normalizedFiles.slice(
        0,
        mode === 'append' ? availableSlots : MAX_SOURCE_IMAGES,
      )

      if (nextFiles.length === 0) {
        if (mode === 'replace') {
          setSourceImages([])
          setStatusMessage('')
        }
        return
      }

      try {
        const preparedImages = await Promise.all(nextFiles.map(prepareSourceImage))
        const mergedImages = mode === 'append' ? [...currentImages, ...preparedImages] : preparedImages
        const compressedCount = preparedImages.filter((image) => image.wasCompressed).length
        const nextPrimaryImage = mergedImages[0]
        const adjustedPrimarySize = nextPrimaryImage
          ? fitSizeToAllowedRange(nextPrimaryImage.originalWidth, nextPrimaryImage.originalHeight)
          : null
        const messages: string[] = []

        setSourceImages(mergedImages)
        setTaskMode('edit')
        setErrorMessage('')

        if (mode === 'append') {
          messages.push(`已添加 ${preparedImages.length} 张参考图。`)
        }

        if (normalizedFiles.length > nextFiles.length) {
          messages.push(`最多保留 ${MAX_SOURCE_IMAGES} 张，本次仅使用前 ${nextFiles.length} 张。`)
        }

        if (compressedCount > 0) {
          messages.push(`已自动压缩 ${compressedCount} 张参考图到 10MB 限制内。`)
        }

        if (
          nextPrimaryImage &&
          adjustedPrimarySize &&
          formatDimensions(nextPrimaryImage.originalWidth, nextPrimaryImage.originalHeight) !==
            formatDimensions(adjustedPrimarySize.width, adjustedPrimarySize.height)
        ) {
          messages.push(
            `首张参考图尺寸超范围，请求尺寸会按比例调整为 ${formatDimensions(
              adjustedPrimarySize.width,
              adjustedPrimarySize.height,
            )}。`,
          )
        }

        setStatusMessage(messages.join(' '))
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error))
        if (mode === 'replace') {
          setSourceImages([])
          setStatusMessage('')
        }
      }
    },
    [sourceImages],
  )

  async function handleSourceImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_SOURCE_IMAGES)
    try {
      await applySourceFiles(files, 'replace')
    } finally {
      event.target.value = ''
    }
  }

  function handleStageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
    if (files.length > 0) {
      void applySourceFiles(files, 'append')
    }
  }

  useEffect(() => {
    if (!active) return

    const handleWindowPaste = (event: ClipboardEvent) => {
      if (isEditableElement(document.activeElement)) {
        return
      }

      const imageFiles = getClipboardImageFiles(event.clipboardData)
      if (imageFiles.length === 0) return

      event.preventDefault()
      void applySourceFiles(imageFiles, 'append')
    }

    window.addEventListener('paste', handleWindowPaste)
    return () => window.removeEventListener('paste', handleWindowPaste)
  }, [active, applySourceFiles])

  function handleTaskModeChange(mode: TaskMode) {
    setTaskMode(mode)
    if (mode === 'text' && sourceImages.length > 0) {
      setSourceImages([])
      setStatusMessage('已切换到文生图，参考图已移除。')
    }
  }

  function handleRemoveSource(index: number) {
    setSourceImages((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index)
      if (next.length === 0) {
        setTaskMode('text')
      }
      return next
    })
    setStatusMessage('')
  }

  function handleClearSources() {
    setSourceImages([])
    setTaskMode('text')
    setStatusMessage('')
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!prompt.trim()) {
      setErrorMessage('请先写下画面描述（提示词）。')
      promptRef.current?.focus()
      return
    }

    if (!isTauri) {
      setErrorMessage('当前为网页模式。请通过 `npm run tauri:dev` 或打包后的桌面应用使用生图功能。')
      return
    }

    if (taskMode === 'edit' && sourceImages.length === 0) {
      setErrorMessage('图生图需要至少一张参考图，请先上传或粘贴。')
      return
    }

    if (manualSizeError) {
      setErrorMessage(manualSizeError)
      return
    }

    if (
      settings.preserveSourceSize &&
      sourceImages.length > 0 &&
      !isSizeDisabled &&
      !constrainedSourceDimensions
    ) {
      setErrorMessage(
        `首张参考图比例过于极端，无法在 ${MIN_REQUEST_IMAGE_DIMENSION}-${MAX_REQUEST_IMAGE_DIMENSION}px 范围内保持比例，请改为手动填写尺寸。`,
      )
      return
    }

    setIsGenerating(true)
    setPendingPrompt(prompt)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const response = await requestImages({
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        extraBody: settings.extraBody,
        imageCount: effectiveImageCount,
        negativePrompt: settings.negativePrompt,
        prompt,
        selectedModel: effectiveSelectedModel,
        size: effectiveRequestSize,
        sourceImages: sourceImages.map((image) => image.dataUrl),
      })

      setHistoryEntries((current) => {
        const nextEntry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          images: response.images,
          imageCount: effectiveImageCount,
          model: response.model ?? currentActiveModelId,
          negativePrompt: settings.negativePrompt,
          prompt,
          size: effectiveRequestSize,
          sourceImageCount: sourceImages.length,
          taskType: response.taskType ?? taskLabel,
        }

        return [nextEntry, ...current].slice(0, MAX_HISTORY_ITEMS)
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleImageAction(image: GeneratedImage, index: number) {
    try {
      await openGeneratedImage(image, index)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }

  function applyHistory(entry: HistoryEntry) {
    setPrompt(entry.prompt)
    onChange('imageCount', entry.imageCount)
    onChange('negativePrompt', entry.negativePrompt)
    onChange('selectedModel', entry.model)
    onChange('size', entry.size)

    if (entry.taskType === '图生图') {
      setSourceImages([])
      setTaskMode('edit')
      setStatusMessage('已恢复图生图参数，请重新上传参考图。')
    } else {
      setStatusMessage('已恢复历史参数，可直接再次生成。')
    }
  }

  const previewImage = preview ? preview.entry.images[preview.index] ?? null : null

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-border/70 bg-card/40 shadow-[var(--shadow-sm)]"
      onDragOver={(event) => {
        event.preventDefault()
        if (event.dataTransfer.types.includes('Files')) setIsDragging(true)
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsDragging(false)
        }
      }}
      onDrop={handleStageDrop}
    >
      <Ambient />

      <ImageStage
        entries={historyEntries}
        isGenerating={isGenerating}
        pendingPrompt={pendingPrompt}
        pendingCount={effectiveImageCount}
        isTauri={isTauri}
        onImageAction={(image, index) => void handleImageAction(image, index)}
        onPreview={(entry, index) => setPreview({ entry, index })}
        onApplyEntry={applyHistory}
        onDeleteEntry={(id) => setHistoryEntries((current) => current.filter((entry) => entry.id !== id))}
        onClearEntries={() => setHistoryEntries([])}
        onOpenSettings={onOpenSettings}
        samples={SAMPLE_PROMPTS}
        onUseSample={(sample) => {
          setPrompt(sample)
          promptRef.current?.focus()
        }}
        isDragging={isDragging}
      />

      <ImageComposer
        modelState={{
          autoModel: currentAutoModel ?? '',
          activeModelId: currentActiveModelId,
          capabilitySummary: currentModelCapability?.capabilitySummary ?? '',
          error: modelProfileError,
          isLoading: isLoadingModelProfile,
          onSelectModel: (value) => onChange('selectedModel', value === 'auto' ? '' : value),
          selectableModels: currentSelectableModels,
          selectedModel: effectiveSelectedModel,
        }}
        taskMode={taskMode}
        onTaskModeChange={handleTaskModeChange}
        prompt={prompt}
        promptRef={promptRef}
        onPromptChange={setPrompt}
        isGenerating={isGenerating}
        apiReady={settings.apiKey.trim().length >= 20}
        onOpenSettings={onOpenSettings}
        onSubmit={() => void handleSubmit()}
        sourceImages={sourceImages}
        onPickFiles={(files) => void applySourceFiles(files, 'append')}
        onSourceImageChange={(event) => void handleSourceImageChange(event)}
        onRemoveSource={handleRemoveSource}
        onClearSources={handleClearSources}
        preserveSourceSize={settings.preserveSourceSize}
        onPreserveSourceSizeChange={(value) => onChange('preserveSourceSize', value)}
        preserveHint={preserveHint}
        sizeState={{
          disabled: isSizeDisabled,
          error: manualSizeError,
          hint: sizeHint,
          lockedToSource: shouldPreserveSourceSize,
          onChange: (value) => onChange('size', value),
          presets: availableSizePresets,
          value: settings.size,
          effectiveValue: effectiveRequestSize,
        }}
        countState={{
          onChange: (value) => onChange('imageCount', value),
          options: imageCountOptions,
          value: effectiveImageCount,
        }}
        advanced={{
          extraBody: settings.extraBody,
          negativePrompt: settings.negativePrompt,
          onExtraBodyChange: (value) => onChange('extraBody', value),
          onNegativePromptChange: (value) => onChange('negativePrompt', value),
        }}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage('')}
        requestSize={effectiveRequestSize}
      />

      <ImageLightbox
        image={previewImage}
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
        onAction={() => {
          if (previewImage && preview) {
            void handleImageAction(previewImage, preview.index)
          }
        }}
        prompt={preview?.entry.prompt ?? ''}
        modelId={preview?.entry.model ?? ''}
        index={preview?.index ?? 0}
      />
    </div>
  )
}
