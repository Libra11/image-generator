import { lazy, Suspense, useState } from 'react'
import { CircleAlert, Cuboid, Download, Film, LoaderCircle, Trash2 } from 'lucide-react'
import { openGeneratedImage } from '@/lib/api'
import { formatHistoryTime } from '@/lib/image'
import { isPending, safeMediaUrl, STATUS_LABELS } from '@/lib/media'
import type { MediaKind, MediaOutput, MediaTask } from '@/lib/media'
import { EmptyState } from '@/components/studio/EmptyState'
import { Feed, UserBubble } from '@/components/studio/feed'
import { StageHeader } from '@/components/studio/StageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ModelViewer = lazy(() => import('@/components/model3d/ModelViewer').then((m) => ({ default: m.ModelViewer })))

type TaskStatus = MediaOutput['task_status']

function StatusDot({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        status === 'SUCCEEDED' && 'bg-emerald-400',
        (status === 'FAILED' || status === 'CANCELED') && 'bg-destructive',
        (status === 'PENDING' || status === 'RUNNING') && 'animate-pulse bg-amber-400',
        status === 'UNKNOWN' && 'bg-muted-foreground/50',
      )}
    />
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium',
        status === 'SUCCEEDED' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        (status === 'FAILED' || status === 'CANCELED') && 'border-destructive/30 bg-destructive/10 text-destructive',
        (status === 'PENDING' || status === 'RUNNING') && 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        status === 'UNKNOWN' && 'border-border bg-muted text-muted-foreground',
      )}
    >
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function MediaResults({ kind, tasks, submitting, pendingPrompt, paused, resume, showSamples, onUseSample, removeTask, clearTasks }: {
  kind: MediaKind
  tasks: MediaTask[]
  submitting: boolean
  pendingPrompt: string
  paused: boolean
  resume: () => void
  showSamples: boolean
  onUseSample: (prompt: string) => void
  removeTask: (taskId: string) => void
  clearTasks: () => void
}) {
  const [openError, setOpenError] = useState('')
  const video = kind === 'video'
  const Icon = video ? Film : Cuboid
  const isEmpty = tasks.length === 0 && !submitting
  const latestPending = tasks.find(isPending) ?? null

  const samples = video
    ? [
      { title: '江南水乡', prompt: '清晨薄雾中的江南水乡，乌篷船缓缓驶过，镜头平稳推进' },
      { title: '宇航橘猫', prompt: '一只戴着宇航头盔的橘猫，缓缓漂浮在璀璨星云中，电影感光线' },
      { title: '赛博雨夜', prompt: '赛博朋克都市的雨夜，霓虹灯在湿漉漉的街道上反射，镜头缓慢跟随一位撑伞行人' },
    ]
    : [
      { title: '宇航橘猫', prompt: '一只戴着宇航头盔的橘猫，圆润造型，精细的金属与织物材质' },
      { title: '漂浮小岛', prompt: '低多边形风格的漂浮小岛，瀑布与发光水晶，梦幻配色' },
      { title: '复古机器人', prompt: '复古科幻机器人，做旧金属材质，圆润关节，皮克斯风格' },
    ]

  async function open(url: string) {
    try { setOpenError(''); await openGeneratedImage({ src: url, sourceType: 'url' }, 0) }
    catch (e) { setOpenError(String(e)) }
  }

  function resultCard(task: MediaTask) {
    const output = task.output
    const result = output.results?.[0]
    const url = safeMediaUrl(video ? output.video_url : result?.pbr_model_url ?? result?.base_model_url)

    if (url) {
      return video ? (
        <video
          key={url}
          src={url}
          controls
          preload="auto"
          className="max-h-[46vh] max-w-full rounded-2xl bg-black shadow-[var(--shadow-lg)]"
        />
      ) : (
        <Suspense fallback={<p className="py-16 text-center text-sm text-muted-foreground">正在加载 3D 视口…</p>}>
          <ModelViewer key={url} src={url} />
        </Suspense>
      )
    }

    const pending = output.task_status === 'PENDING' || output.task_status === 'RUNNING'
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card/50 px-4 py-8 text-center">
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin text-modality" />
            <p className="text-xs font-medium text-foreground">
              {STATUS_LABELS[output.task_status]} · 每 15 秒查询一次
            </p>
            {paused && latestPending?.output.task_id === output.task_id ? (
              <p className="text-[11px] text-muted-foreground">
                查询已暂停，云端任务可能仍在运行 ·{' '}
                <button type="button" onClick={resume} className="font-medium text-modality transition-opacity hover:opacity-80">
                  继续查询
                </button>
              </p>
            ) : null}
            <p className="max-w-full truncate font-mono text-[10px] text-muted-foreground/70" title={output.task_id}>
              ID {output.task_id}
            </p>
          </>
        ) : (
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            {output.message ||
              (output.task_status === 'SUCCEEDED'
                ? '任务已完成，但服务未返回可用的资源链接。请凭任务 ID 在百炼控制台检查。'
                : output.task_status === 'UNKNOWN'
                  ? '任务查询有效期为 24 小时，请到百炼控制台检查。'
                  : STATUS_LABELS[output.task_status])}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <StageHeader
        icon={Icon}
        title={video ? '视频工作台' : '3D 工作台'}
        description={video ? '把画面、运动与镜头语言编织成故事' : '从平面灵感出发，探索可交互的立体模型'}
        actions={
          tasks.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearTasks}>
              <Trash2 className="h-3.5 w-3.5" />
              清空
            </Button>
          ) : undefined
        }
      >
        {tasks[0] ? (
          <span className="inline-flex h-6 max-w-[200px] items-center truncate rounded-md border border-border/70 bg-card/50 px-2 font-mono text-[10px] text-muted-foreground">
            {tasks[0].model}
          </span>
        ) : null}
        {latestPending ? <StatusBadge status={latestPending.output.task_status} /> : null}
      </StageHeader>

      <Feed scrollKey={`${tasks.length}-${tasks[0]?.output.task_status ?? ''}-${submitting}-${paused}`}>
        <div className={cn('mx-auto w-full max-w-4xl px-5 py-6 sm:px-6', isEmpty && 'flex min-h-full flex-col')}>
          {openError ? (
            <p role="alert" className="mx-auto mb-4 flex w-fit max-w-full items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {openError}
            </p>
          ) : null}

          {isEmpty ? (
            <EmptyState
              icon={Icon}
              eyebrow={video ? 'AI VIDEO STUDIO' : 'AI 3D STUDIO'}
              title={video ? '让灵感，在时间里流动。' : '从一个想法，构建立体世界。'}
              description={
                video
                  ? '描述画面、运动与镜头，让每一帧都服务于你的故事。'
                  : '描述造型、材质与风格，快速获得可预览、可下载的 3D 模型。'
              }
              samples={showSamples ? samples : []}
              onUseSample={onUseSample}
            />
          ) : (
            <div className="space-y-6">
              {[...tasks].reverse().map((task, index) => {
                const output = task.output
                const url = safeMediaUrl(video ? output.video_url : output.results?.[0]?.pbr_model_url ?? output.results?.[0]?.base_model_url)
                return (
                  <div
                    key={output.task_id}
                    className="animate-rise space-y-2"
                    style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
                  >
                    <UserBubble>{task.prompt || '参考图生成'}</UserBubble>

                    <div>
                      {resultCard(task)}

                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <StatusBadge status={output.task_status} />
                        <span className="inline-flex h-5 max-w-[180px] items-center truncate rounded-md border border-border/70 bg-card/50 px-1.5 font-mono">
                          {task.model}
                        </span>
                        <span>{formatHistoryTime(task.createdAt)}</span>
                        <span className="flex-1" />
                        {url ? (
                          <button
                            type="button"
                            onClick={() => void open(url)}
                            title="打开下载链接"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeTask(output.task_id)}
                          title="删除该条"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {submitting && !latestPending ? (
                <div className="animate-rise space-y-2">
                  <UserBubble>{pendingPrompt || '提交中'}</UserBubble>
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/50 px-4 py-6 text-xs text-muted-foreground">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-modality" />
                    正在提交任务…
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Feed>

      <p className="shrink-0 pb-1.5 pt-1 text-center text-[10px] text-muted-foreground/70">
        {video ? '视频链接有效期为 24 小时' : 'Tripo 模型链接有效期为 2 小时'} · 请及时下载，记录仅保留链接，不保存文件
      </p>
    </div>
  )
}
