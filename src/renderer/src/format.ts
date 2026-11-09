import type { BranchInfo, ChangeKind } from '@shared/types'

export const KIND_LABEL: Record<ChangeKind, string> = {
  added: 'Added',
  modified: 'Edited',
  deleted: 'Deleted',
  renamed: 'Renamed',
  copied: 'Copied',
  typechange: 'Type changed',
  conflicted: 'Conflict'
}

/** Splits "src/app/main.ts" into the folder and the file name. Folders keep their trailing "/". */
export function splitPath(path: string): { dir: string; name: string } {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path
  const index = trimmed.lastIndexOf('/')
  const suffix = path.endsWith('/') ? '/' : ''
  if (index === -1) return { dir: '', name: trimmed + suffix }
  return { dir: trimmed.slice(0, index + 1), name: trimmed.slice(index + 1) + suffix }
}

export function repoName(root: string): string {
  const parts = root.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? root
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60]
]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function relativeTime(unixSeconds: number, nowMs: number = Date.now()): string {
  const diff = unixSeconds - Math.floor(nowMs / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return relative.format(Math.round(diff / size), unit)
  }
  return 'just now'
}

export interface RefLabel {
  label: string
  kind: 'head' | 'branch' | 'remote' | 'tag'
}

/** Turns Git's decoration text ("HEAD -> main", "tag: v1", "origin/main") into display labels. */
export function parseRef(ref: string): RefLabel {
  if (ref.startsWith('HEAD -> ')) return { label: ref.slice(8), kind: 'head' }
  if (ref === 'HEAD') return { label: 'HEAD', kind: 'head' }
  if (ref.startsWith('tag: ')) return { label: ref.slice(5), kind: 'tag' }
  if (ref.includes('/')) return { label: ref, kind: 'remote' }
  return { label: ref, kind: 'branch' }
}

function commits(count: number): string {
  return `${count} ${count === 1 ? 'commit' : 'commits'}`
}

/** One plain sentence about how the branch relates to its remote, or null if there is nothing to say. */
export function describeSync(branch: BranchInfo): string | null {
  if (!branch.upstream) return null
  if (branch.ahead === 0 && branch.behind === 0) return `Up to date with ${branch.upstream}`
  const parts: string[] = []
  if (branch.ahead > 0) parts.push(`${commits(branch.ahead)} to push`)
  if (branch.behind > 0) parts.push(`${commits(branch.behind)} to pull`)
  return parts.join(', ')
}
