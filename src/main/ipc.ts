import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type { ActionRequest, IpcError, Result } from '@shared/types'
import { OperationLog, describeAction } from './actions'
import { GitError, HandrailError } from './errors'
import { getLog, getStatus, resolveRepoRoot } from './git'

const MAX_PATHS = 50_000

/**
 * Repositories the person opened through the folder picker in this session. The renderer can only
 * act on these, so a compromised page cannot point Git at an arbitrary folder.
 */
const openedRoots = new Set<string>()
const operations = new OperationLog()

function toIpcError(error: unknown): IpcError {
  if (error instanceof GitError) {
    return { message: error.message, command: error.command, stderr: error.stderr }
  }
  if (error instanceof HandrailError) return { message: error.message }
  console.error(error)
  return { message: 'Something went wrong inside Handrail. See the developer console for details.' }
}

function handle<Args extends unknown[], T>(
  channel: string,
  fn: (...args: Args) => Promise<T> | T
): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<Result<T>> => {
    try {
      return { ok: true, value: await fn(...(args as Args)) }
    } catch (error) {
      return { ok: false, error: toIpcError(error) }
    }
  })
}

function assertOpened(root: unknown): string {
  if (typeof root !== 'string' || !openedRoots.has(root)) {
    throw new HandrailError('Open this repository in Handrail first.')
  }
  return root
}

function assertRequest(request: unknown): ActionRequest {
  const candidate = request as Partial<ActionRequest> | null
  const validType = candidate?.type === 'stage' || candidate?.type === 'unstage'
  const paths = candidate?.paths
  if (
    !validType ||
    !Array.isArray(paths) ||
    paths.length > MAX_PATHS ||
    !paths.every((p) => typeof p === 'string' && p.length > 0 && !p.includes('\0'))
  ) {
    throw new HandrailError('That request was not understood.')
  }
  return { type: candidate.type as ActionRequest['type'], paths: paths as string[] }
}

export function registerIpc(): void {
  handle(IPC.openRepository, async () => {
    const window = BrowserWindow.getFocusedWindow() ?? undefined
    const options = {
      title: 'Open a Git repository',
      properties: ['openDirectory' as const]
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    const folder = result.filePaths[0]
    if (result.canceled || !folder) return null

    const root = await resolveRepoRoot(folder)
    if (!root) {
      throw new HandrailError(
        'That folder is not a Git repository. Choose the folder that contains your project.'
      )
    }
    openedRoots.add(root)
    return root
  })

  handle(IPC.getStatus, (root: unknown) => getStatus(assertOpened(root)))

  handle(IPC.getLog, (root: unknown, limit?: unknown) =>
    getLog(assertOpened(root), {
      limit: typeof limit === 'number' && limit > 0 ? Math.min(limit, 5000) : undefined
    })
  )

  handle(IPC.previewAction, (root: unknown, request: unknown) => {
    assertOpened(root)
    return describeAction(assertRequest(request))
  })

  handle(IPC.runAction, (root: unknown, request: unknown) =>
    operations.perform(assertOpened(root), assertRequest(request))
  )

  handle(IPC.undoOperation, (root: unknown, id: unknown) => {
    if (typeof id !== 'string') throw new HandrailError('That request was not understood.')
    return operations.undo(assertOpened(root), id)
  })

  handle(IPC.listOperations, (root: unknown) => operations.list(assertOpened(root)))
}
