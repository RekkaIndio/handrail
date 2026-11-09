import type {
  ActionPreview,
  ActionRequest,
  Commit,
  OperationRecord,
  RepoStatus,
  Result
} from './types'

/** Channel names. Keep in one place so main and preload cannot drift apart. */
export const IPC = {
  openRepository: 'repo:open',
  getStatus: 'repo:status',
  getLog: 'repo:log',
  previewAction: 'action:preview',
  runAction: 'action:run',
  undoOperation: 'action:undo',
  listOperations: 'action:list'
} as const

/** The API the preload script exposes to the renderer as `window.handrail`. */
export interface HandrailApi {
  /** Shows a folder picker. Resolves to the repository root, or null if cancelled. */
  openRepository(): Promise<Result<string | null>>
  getStatus(root: string): Promise<Result<RepoStatus>>
  getLog(root: string, limit?: number): Promise<Result<Commit[]>>
  previewAction(root: string, request: ActionRequest): Promise<Result<ActionPreview>>
  runAction(root: string, request: ActionRequest): Promise<Result<OperationRecord>>
  undoOperation(root: string, id: string): Promise<Result<OperationRecord>>
  listOperations(root: string): Promise<Result<OperationRecord[]>>
}
