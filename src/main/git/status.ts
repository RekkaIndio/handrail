import type { BranchInfo, ChangeKind, FileChange, ParsedStatus, RepoStatus } from '@shared/types'
import { defaultRunner, type GitRunner } from './runner'

const KIND_BY_LETTER: Record<string, ChangeKind> = {
  M: 'modified',
  T: 'typechange',
  A: 'added',
  D: 'deleted',
  R: 'renamed',
  C: 'copied'
}

/** Splits into at most `count` parts; the last part keeps any remaining spaces (file names). */
function splitFields(entry: string, count: number): string[] {
  const parts: string[] = []
  let rest = entry
  while (parts.length < count - 1) {
    const index = rest.indexOf(' ')
    if (index === -1) break
    parts.push(rest.slice(0, index))
    rest = rest.slice(index + 1)
  }
  parts.push(rest)
  return parts
}

function emptyBranch(): BranchInfo {
  return { oid: null, head: null, detached: false, upstream: null, ahead: 0, behind: 0 }
}

function applyBranchHeader(branch: BranchInfo, line: string): void {
  const [key, ...rest] = line.slice(2).split(' ')
  const value = rest.join(' ')
  switch (key) {
    case 'branch.oid':
      branch.oid = value === '(initial)' ? null : value
      break
    case 'branch.head':
      branch.detached = value === '(detached)'
      branch.head = branch.detached ? null : value
      break
    case 'branch.upstream':
      branch.upstream = value
      break
    case 'branch.ab': {
      const match = /^\+(\d+) -(\d+)$/.exec(value)
      if (match) {
        branch.ahead = Number(match[1])
        branch.behind = Number(match[2])
      }
      break
    }
  }
}

/**
 * Parses the output of `git status --porcelain=v2 --branch -z`.
 *
 * Each entry ends in a NUL byte. A renamed or copied entry ("2 ...") is followed by one extra
 * NUL-terminated token holding the original path.
 */
export function parseStatus(output: string): ParsedStatus {
  const tokens = output.split('\0')
  const branch = emptyBranch()
  const staged: FileChange[] = []
  const unstaged: FileChange[] = []
  const conflicted: FileChange[] = []
  const untracked: string[] = []

  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i]
    if (!entry) continue

    switch (entry[0]) {
      case '#':
        applyBranchHeader(branch, entry)
        break

      case '1':
      case '2': {
        const isRename = entry[0] === '2'
        const fields = splitFields(entry, isRename ? 10 : 9)
        const xy = fields[1] ?? '..'
        const path = fields[fields.length - 1] ?? ''
        const originalPath = isRename ? tokens[++i] : undefined

        const indexKind = KIND_BY_LETTER[xy[0] ?? '.']
        const worktreeKind = KIND_BY_LETTER[xy[1] ?? '.']
        if (indexKind) {
          const change: FileChange = { path, kind: indexKind }
          if (originalPath) change.originalPath = originalPath
          staged.push(change)
        }
        if (worktreeKind) unstaged.push({ path, kind: worktreeKind })
        break
      }

      case 'u': {
        const fields = splitFields(entry, 11)
        conflicted.push({ path: fields[fields.length - 1] ?? '', kind: 'conflicted' })
        break
      }

      case '?':
        untracked.push(entry.slice(2))
        break

      default:
        // "!" (ignored) and anything newer Git versions add are not shown.
        break
    }
  }

  return {
    branch,
    staged,
    unstaged,
    conflicted,
    untracked,
    isClean:
      staged.length === 0 &&
      unstaged.length === 0 &&
      conflicted.length === 0 &&
      untracked.length === 0
  }
}

export async function getStatus(
  root: string,
  runner: GitRunner = defaultRunner
): Promise<RepoStatus> {
  const { stdout } = await runner.run(root, [
    'status',
    '--porcelain=v2',
    '--branch',
    '-z',
    '--untracked-files=normal'
  ])
  return { root, ...parseStatus(stdout) }
}
