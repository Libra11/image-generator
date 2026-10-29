import { useCallback, useEffect, useRef, useState } from 'react'
import { isTauriRuntime } from '@/lib/api'
import { createMediaTask, isPending, queryMediaTask, readMediaTasks } from '@/lib/media'
import type { MediaForm, MediaKind, MediaTask } from '@/lib/media'
import type { PersistedSettings } from '@/lib/types'

export function useMediaTask(kind: MediaKind, settings: PersistedSettings) {
  const [tasks, setTasks] = useState(() => readMediaTasks(kind))
  const task = tasks[0] ?? null
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paused, setPaused] = useState(false)
  const busy = useRef(false)
  const queryBusy = useRef(false)
  const credentials = useRef(settings.apiKey)
  useEffect(() => { credentials.current = settings.apiKey }, [settings.apiKey])

  const saveTasks = useCallback((next: MediaTask[]) => {
    setTasks(next)
    try {
      localStorage.setItem(`image-generator.${kind}.tasks`, JSON.stringify(next))
      setStorageError('')
    } catch { setStorageError('本机存储失败，请记录任务 ID，关闭应用后可能无法恢复。') }
  }, [kind])

  useEffect(() => {
    if (!task || !isPending(task) || paused || !isTauriRuntime()) return
    let disposed = false
    const timer = window.setTimeout(async () => {
      if (queryBusy.current) return
      queryBusy.current = true
      try {
        const result = await queryMediaTask(task, credentials.current)
        if (!disposed) {
          saveTasks(tasks.map((t) => t.output.task_id === task.output.task_id ? { ...t, output: result.output } : t))
          setError('')
        }
      } catch (e) {
        if (!disposed) { setError(String(e)); setPaused(true) }
      } finally { queryBusy.current = false }
    }, 15000)
    return () => { disposed = true; window.clearTimeout(timer) }
  }, [task, tasks, paused, saveTasks])

  async function submit(form: MediaForm) {
    if (busy.current || isPending(task)) return
    if (!isTauriRuntime()) { setError('请在桌面应用中生成；浏览器仅支持界面预览。'); return }
    busy.current = true
    setSubmitting(true)
    setError('')
    try {
      const result = await createMediaTask(form, settings)
      saveTasks([{ output: result.output, model: form.model, prompt: form.prompt, baseUrl: settings.baseUrl, createdAt: new Date().toISOString() }, ...tasks].slice(0, 12))
      setPaused(false)
    } catch (e) { setError(String(e)) }
    finally { busy.current = false; setSubmitting(false) }
  }
  return {
    task, tasks, error, storageError, submitting, paused,
    submit,
    resume: () => { setError(''); setPaused(false) },
    removeTask: (taskId: string) => saveTasks(tasks.filter((t) => t.output.task_id !== taskId)),
    clearTasks: () => saveTasks([]),
  }
}
