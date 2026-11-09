import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActionRequest, Commit, IpcError, OperationRecord, RepoStatus } from '@shared/types'

export type Notice =
  | { kind: 'done'; operation: OperationRecord }
  | { kind: 'undone'; operation: OperationRecord }
  | { kind: 'error'; error: IpcError }

export interface Repository {
  root: string | null
  status: RepoStatus | null
  commits: Commit[]
  operations: OperationRecord[]
  notice: Notice | null
  busy: boolean
  open(): Promise<void>
  run(request: ActionRequest): Promise<void>
  undo(id: string): Promise<void>
  dismissNotice(): void
}

export function useRepository(): Repository {
  const [root, setRoot] = useState<string | null>(null)
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [operations, setOperations] = useState<OperationRecord[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)

  // Ignore answers that arrive after a newer refresh was started.
  const latestRefresh = useRef(0)

  const refresh = useCallback(async (target: string | null) => {
    if (!target) return
    const ticket = ++latestRefresh.current
    const api = window.handrail
    const [nextStatus, nextLog, nextOps] = await Promise.all([
      api.getStatus(target),
      api.getLog(target),
      api.listOperations(target)
    ])
    if (ticket !== latestRefresh.current) return

    if (nextStatus.ok) setStatus(nextStatus.value)
    else setNotice({ kind: 'error', error: nextStatus.error })
    if (nextLog.ok) setCommits(nextLog.value)
    if (nextOps.ok) setOperations(nextOps.value)
  }, [])

  // Pick up changes made in an editor or terminal when the person returns to the window.
  useEffect(() => {
    const onFocus = (): void => void refresh(root)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [root, refresh])

  const open = useCallback(async () => {
    const result = await window.handrail.openRepository()
    if (!result.ok) return setNotice({ kind: 'error', error: result.error })
    if (result.value === null) return // cancelled
    setRoot(result.value)
    setStatus(null)
    setCommits([])
    setOperations([])
    setNotice(null)
    await refresh(result.value)
  }, [refresh])

  const run = useCallback(
    async (request: ActionRequest) => {
      if (!root) return
      setBusy(true)
      try {
        const result = await window.handrail.runAction(root, request)
        setNotice(
          result.ok
            ? { kind: 'done', operation: result.value }
            : { kind: 'error', error: result.error }
        )
        await refresh(root)
      } finally {
        setBusy(false)
      }
    },
    [root, refresh]
  )

  const undo = useCallback(
    async (id: string) => {
      if (!root) return
      setBusy(true)
      try {
        const result = await window.handrail.undoOperation(root, id)
        setNotice(
          result.ok
            ? { kind: 'undone', operation: result.value }
            : { kind: 'error', error: result.error }
        )
        await refresh(root)
      } finally {
        setBusy(false)
      }
    },
    [root, refresh]
  )

  const dismissNotice = useCallback(() => setNotice(null), [])

  return { root, status, commits, operations, notice, busy, open, run, undo, dismissNotice }
}
