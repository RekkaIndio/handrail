/** Types shared by the main process, the preload bridge and the renderer. */

export type ChangeKind =
  'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'typechange' | 'conflicted'

export interface FileChange {
  path: string
  kind: ChangeKind
  /** Only set for renames and copies that are staged. */
  originalPath?: string
}

export interface BranchInfo {
  /** Full commit id, or null when the repository has no commits yet. */
  oid: string | null
  /** Branch name, or null when HEAD is detached. */
  head: string | null
  detached: boolean
  upstream: string | null
  ahead: number
  behind: number
}

export interface ParsedStatus {
  branch: BranchInfo
  /** Changes in the staging area, ready to be committed. */
  staged: FileChange[]
  /** Changes in the working folder that are not staged. */
  unstaged: FileChange[]
  conflicted: FileChange[]
  /** New files Git does not track yet. Directories end in "/". */
  untracked: string[]
  isClean: boolean
}

export interface RepoStatus extends ParsedStatus {
  root: string
}

export interface Commit {
  hash: string
  shortHash: string
  parents: string[]
  authorName: string
  authorEmail: string
  /** Unix time in seconds. */
  authoredAt: number
  /** Branch, tag and HEAD labels pointing at this commit. */
  refs: string[]
  subject: string
}

/** Everything the app can do to a repository, as plain data. Grows with each milestone. */
export type ActionRequest =
  { type: 'stage'; paths: string[] } | { type: 'unstage'; paths: string[] }

export interface ActionPreview {
  title: string
  /** One or two sentences in plain English, shown before and after the action. */
  summary: string
  /** The Git commands that will run, for people who want to learn them. */
  gitCommands: string[]
  reversible: boolean
}

export interface OperationRecord {
  id: string
  /** Unix time in milliseconds. */
  at: number
  preview: ActionPreview
  status: 'done' | 'undone'
  undoable: boolean
}

export interface IpcError {
  message: string
  command?: string
  stderr?: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: IpcError }
