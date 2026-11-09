import type { Commit } from '@shared/types'
import { GitError } from '../errors'
import { defaultRunner, type GitRunner } from './runner'

const FIELD = '\x1f'
const RECORD = '\x1e'
// hash, parents, author name, author email, author time, ref names, subject
const FORMAT = ['%H', '%P', '%an', '%ae', '%at', '%D', '%s'].join('%x1f') + '%x1e'

/** Parses the output of `git log` run with the format above. */
export function parseLog(output: string): Commit[] {
  const commits: Commit[] = []
  for (const record of output.split(RECORD)) {
    const trimmed = record.replace(/^\n/, '')
    if (!trimmed) continue
    const [hash, parents, authorName, authorEmail, authoredAt, refs, subject] = trimmed.split(FIELD)
    if (!hash) continue
    commits.push({
      hash,
      shortHash: hash.slice(0, 7),
      parents: parents ? parents.split(' ') : [],
      authorName: authorName ?? '',
      authorEmail: authorEmail ?? '',
      authoredAt: Number(authoredAt ?? 0),
      refs: refs ? refs.split(', ').filter(Boolean) : [],
      subject: subject ?? ''
    })
  }
  return commits
}

export interface LogOptions {
  limit?: number
  /** Include every branch and tag, not only the current branch. Defaults to true. */
  all?: boolean
}

export async function getLog(
  root: string,
  options: LogOptions = {},
  runner: GitRunner = defaultRunner
): Promise<Commit[]> {
  const { limit = 200, all = true } = options
  const args = ['log', `--max-count=${limit}`, '--topo-order', `--format=${FORMAT}`]
  if (all) args.push('--all')

  try {
    const { stdout } = await runner.run(root, args)
    return parseLog(stdout)
  } catch (error) {
    // A repository with no commits yet makes `git log` fail; that is an empty history, not an error.
    if (error instanceof GitError && /does not have any commits yet/.test(error.stderr)) return []
    throw error
  }
}
