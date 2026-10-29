import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Image as ImageIcon, ImagePlus, Images, Info, Layers, LoaderCircle, Sparkles, X } from 'lucide-react'
import { Ambient } from '@/components/studio/Ambient'
import { ComposerBar } from '@/components/studio/ComposerBar'
import { ChipSelect, ModeSwitch } from '@/components/studio/controls'
import { prepareSourceImage } from '@/lib/image'
import { isPending, uploadMediaImage } from '@/lib/media'
import type { MediaForm, MediaKind, MediaWorkspaceProps } from '@/lib/media'
import { cn } from '@/lib/utils'
import { Choice } from './MediaFields'
import { MediaResults } from './MediaResults'
import { useMediaTask } from './useMediaTask'

const options = (values: string[]) => values.map((value) => ({ value, label: value }))

interface StagedFrame {
  name: string
  previewUrl: string
  url: string
  uploading: boolean
  error: string
}

function FrameSlot({ label, staged, onPick, onClear, disabled, allowUpload }: {
  label: string
  staged: StagedFrame | null
  onPick: () => void
  onClear: () => void
  disabled: boolean
  allowUpload: boolean
}) {
  if (staged) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card/50 px-2.5 py-2">
        <img
          src={staged.previewUrl}
          alt={label}
          className="h-10 w-10 shrink-0 rounded-lg border border-border/70 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium">{staged.name}</p>
          <p className={cn('mt-0.5 text-[10px]', staged.error ? 'text-destructive' : 'text-muted-foreground')}>
            {staged.uploading ? `${label}上传中…` : staged.error || `${label}已就绪，提交时使用`}
          </p>
        </div>
        {staged.uploading ? (
          <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-modality" />
        ) : staged.url ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : null}
        <button
          type="button"
          onClick={onClear}
          aria-label={`移除${label}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  if (!allowUpload) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-modality/15 bg-modality-soft/35 px-3 py-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-modality" />
        <div>
          <p className="text-[11px] font-medium text-foreground/85">Tripo 请使用公网图片 URL</p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">百炼临时上传为私有链接，无法用于图生 3D。</p>
        </div>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/30 px-3 py-3 text-[11px] text-muted-foreground transition-colors hover:border-modality/40 hover:text-foreground disabled:opacity-50"
    >
      <ImagePlus className="h-3.5 w-3.5" />
      选择或粘贴（⌘V）{label}图片
    </button>
  )
}

export function MediaWorkspace({ kind, settings, onOpenSettings, active }: MediaWorkspaceProps & { kind: MediaKind }) {
  const video = kind === 'video'
  const [mode, setMode] = useState('text')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<MediaForm>({
    model: video ? 'wan2.7-t2v' : 'Tripo/Tripo-P1.0', prompt: '', image: '', lastFrame: '',
    duration: 5, resolution: '720P', ratio: '16:9', texture: true, textureQuality: 'standard', geometryQuality: 'standard',
  })
  const state = useMediaTask(kind, settings)
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const fileTargetRef = useRef<'first' | 'last'>('first')
  const [firstFrame, setFirstFrame] = useState<StagedFrame | null>(null)
  const [lastFrame, setLastFrame] = useState<StagedFrame | null>(null)
  const [localError, setLocalError] = useState('')
  const update = useCallback(<K extends keyof MediaForm>(key: K, value: MediaForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }, [])
  const busy = state.submitting || isPending(state.task)
  const imageMode = mode !== 'text'

  const stageImage = useCallback(async (file: File, target: 'first' | 'last') => {
    const setSlot = target === 'first' ? setFirstFrame : setLastFrame
    try {
      const image = await prepareSourceImage(file)
      const previewUrl = image.dataUrl
      setLocalError('')
      update(target === 'first' ? 'image' : 'lastFrame', '')
      setSlot({ name: image.name, previewUrl, url: '', uploading: true, error: '' })
      if (!video) {
        setSlot({
          name: image.name,
          previewUrl,
          url: '',
          uploading: false,
          error: '请改用下方公网图片 URL；Tripo 不支持当前私有临时上传。',
        })
        return
      }
      try {
        const url = await uploadMediaImage(
          { filename: image.name, dataBase64: image.dataUrl.split(',')[1] ?? '' },
          form.model,
          settings,
        )
        setSlot({ name: image.name, previewUrl, url, uploading: false, error: '' })
      } catch (error) {
        setSlot({ name: image.name, previewUrl, url: '', uploading: false, error: String(error) })
      }
    } catch (error) {
      setLocalError(String(error))
    }
  }, [form.model, settings, update, video])

  useEffect(() => {
    if (!active || !imageMode) return
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
      if (!file) return
      event.preventDefault()
      void stageImage(file, video && mode === 'frames' && firstFrame && !lastFrame ? 'last' : 'first')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [active, imageMode, video, mode, firstFrame, lastFrame, stageImage])

  function pickFile(target: 'first' | 'last') {
    fileTargetRef.current = target
    fileInputRef.current?.click()
  }

  const modes = video
    ? [
      { value: 'text', label: '文生视频', icon: Sparkles },
      { value: 'image', label: '首帧', icon: ImageIcon },
      { value: 'frames', label: '首尾帧', icon: Images },
    ]
    : [
      { value: 'text', label: '文生 3D', icon: Sparkles },
      { value: 'image', label: '单图生 3D', icon: ImageIcon },
    ]
  const modeLabel = modes.find((m) => m.value === mode)?.label ?? ''
  const summary = video
    ? `${modeLabel} · ${form.duration} 秒 · ${form.resolution}${imageMode ? '' : ` · ${form.ratio}`}`
    : `${modeLabel} · ${form.model.split('/').pop() ?? ''} · ${form.texture ? 'PBR 贴图' : '无贴图'}`
  const firstUrl = imageMode ? form.image.trim() : ''
  const lastUrl = video && mode === 'frames' ? form.lastFrame.trim() : ''
  const uploading = Boolean(firstFrame?.uploading || lastFrame?.uploading)
  const canSubmit = imageMode
    ? !uploading && Boolean(firstUrl) && (mode !== 'frames' || Boolean(lastUrl))
    : Boolean(form.prompt.trim())

  function changeMode(value: string) {
    setMode(value)
    if (video) update('model', value === 'text' ? 'wan2.7-t2v' : 'wan2.7-i2v')
  }

  function submit() {
    if (busy) return
    void state.submit({
      ...form,
      prompt: !video && imageMode ? '' : form.prompt.trim(),
      image: imageMode ? firstUrl : '',
      lastFrame: video && mode === 'frames' ? lastUrl : '',
    })
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-border/70 bg-card/40 shadow-[var(--shadow-sm)]">
      <Ambient />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void stageImage(file, fileTargetRef.current)
          event.target.value = ''
        }}
      />

      <MediaResults
        kind={kind}
        tasks={state.tasks}
        submitting={state.submitting}
        pendingPrompt={form.prompt.trim()}
        paused={state.paused}
        resume={state.resume}
        showSamples={!imageMode}
        onUseSample={(sample) => {
          update('prompt', sample)
          promptRef.current?.focus()
        }}
        removeTask={state.removeTask}
        clearTasks={state.clearTasks}
      />

      <ComposerBar
        value={form.prompt}
        onChange={(value) => update('prompt', value)}
        onSubmit={submit}
        placeholder={
          video
            ? imageMode ? '运动与镜头描述（可选）…' : '描述画面与镜头：主体、运动、光线、风格…'
            : imageMode ? '图生模式无需提示词' : '描述想要的模型：造型、材质、风格…'
        }
        busy={busy}
        canSubmit={canSubmit}
        submitLabel={video ? '生成视频' : '生成 3D 模型'}
        maxLength={video ? 5000 : 1024}
        textareaRef={promptRef}
        error={state.error || state.storageError || localError}
        hint={summary}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        leading={<ModeSwitch value={mode} onChange={changeMode} disabled={busy} options={modes} />}
        chips={
          video ? (
            <>
              <ChipSelect
                value={String(form.duration)}
                onChange={(v) => update('duration', Number(v))}
                disabled={busy}
                title="时长（秒）"
                options={Array.from({ length: 14 }, (_, i) => ({ value: String(i + 2), label: `${i + 2} 秒` }))}
              />
              <ChipSelect
                value={form.resolution}
                onChange={(v) => update('resolution', v)}
                disabled={busy}
                title="分辨率"
                options={options(['720P', '1080P'])}
              />
              {imageMode ? (
                <span className="flex h-8 items-center rounded-lg border border-border bg-card/40 px-2.5 text-[11px] text-muted-foreground" title="输出画幅跟随首帧">
                  画幅跟随首帧
                </span>
              ) : (
                <ChipSelect
                  value={form.ratio}
                  onChange={(v) => update('ratio', v)}
                  disabled={busy}
                  title="画幅"
                  options={options(['16:9', '9:16', '1:1', '4:3', '3:4'])}
                />
              )}
            </>
          ) : (
            <>
              <ChipSelect
                value={form.model}
                onChange={(v) => update('model', v)}
                disabled={busy}
                title="生成模型"
                options={[
                  { value: 'Tripo/Tripo-P1.0', label: 'P1.0 · 最高 2 万面' },
                  { value: 'Tripo/Tripo-H3.1', label: 'H3.1 · 高精度' },
                ]}
              />
              <button
                type="button"
                onClick={() => update('texture', !form.texture)}
                disabled={busy}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] transition-all',
                  form.texture
                    ? 'border-modality/40 bg-modality-soft text-foreground'
                    : 'border-border text-muted-foreground hover:border-modality/30 hover:text-foreground',
                )}
              >
                <Layers className="h-3 w-3" />
                PBR 贴图{form.texture ? ' · 开' : ''}
              </button>
            </>
          )
        }
        top={
          imageMode ? (
            <div className="space-y-2">
              <FrameSlot
                label={video ? '首帧' : '参考图'}
                staged={firstFrame}
                onPick={() => pickFile('first')}
                onClear={() => {
                  setFirstFrame(null)
                  update('image', '')
                }}
                disabled={busy}
                allowUpload={video}
              />
              {mode === 'frames' && (
                <FrameSlot
                  label="尾帧"
                  staged={lastFrame}
                  onPick={() => pickFile('last')}
                  onClear={() => {
                    setLastFrame(null)
                    update('lastFrame', '')
                  }}
                  disabled={busy}
                  allowUpload={video}
                />
              )}
              <div className="space-y-2">
                <input
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  disabled={busy}
                  value={form.image}
                  onChange={(event) => {
                    setFirstFrame(null)
                    update('image', event.target.value)
                  }}
                  placeholder={video ? '或输入首帧图片的公网 URL' : '输入参考图的公网 HTTP(S) URL'}
                  aria-label={video ? '首帧图片 URL' : '3D 参考图公网 URL'}
                  className="field h-9 text-[11px]"
                />
                {mode === 'frames' && (
                  <input
                    type="url"
                    inputMode="url"
                    spellCheck={false}
                    disabled={busy}
                    value={form.lastFrame}
                    onChange={(event) => {
                      setLastFrame(null)
                      update('lastFrame', event.target.value)
                    }}
                    placeholder="或输入尾帧图片的公网 URL"
                    aria-label="尾帧图片 URL"
                    className="field h-9 text-[11px]"
                  />
                )}
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {video
                  ? '本地图片将上传到临时存储（48 小时有效）后作为参考。最长边 ≤ 8000px，宽高 ≥ 240px，≤ 20MB；不支持透明图片。'
                  : '填写无需登录或鉴权即可访问的图片 URL，提交前会检查可访问性。图生模式不传提示词。'}
              </p>
            </div>
          ) : undefined
        }
        drawer={
          <div className="space-y-4">
            {video ? (
              <section className="rounded-xl border border-border bg-card/50 p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    生成模型
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">随方式切换</span>
                </div>
                <p className="font-mono text-[13px]">{form.model}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {imageMode ? '图生视频由 wan2.7-i2v 驱动' : '文生视频由 wan2.7-t2v 驱动'}
                </p>
              </section>
            ) : (
              <>
                {form.texture && (
                  <Choice disabled={busy} label="贴图质量" value={form.textureQuality} onChange={(v) => update('textureQuality', v)} options={[{ value: 'standard', label: '标清' }, { value: 'detailed', label: '高清' }]} />
                )}
                {form.model === 'Tripo/Tripo-H3.1' && (
                  <Choice disabled={busy} label="几何精度" value={form.geometryQuality} onChange={(v) => update('geometryQuality', v)} options={[{ value: 'standard', label: '标准 · 最高 150 万面' }, { value: 'ultra', label: '超清 · 最高 200 万面' }]} />
                )}
              </>
            )}
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                {video ? 'Wan 2.7 使用北京或新加坡地域，按生成时长与分辨率计费。' : '仅支持北京地域；请先在百炼控制台开通 Tripo，按次计费。'}
                共用全局 API 设置，
                <button type="button" onClick={onOpenSettings} className="font-medium text-modality transition-opacity hover:opacity-80">
                  打开设置
                </button>
                。
              </span>
            </p>
          </div>
        }
      />
    </div>
  )
}
