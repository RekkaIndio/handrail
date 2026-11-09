import { normalize } from 'node:path'
import { GitError } from '../errors'
import { defaultRunner, type GitRunner } from './runner'

/** Returns the top-level folder of the repository containing `dir`, or null if there is none. */
export async function resolveRepoRoot(
  dir: string,
  runner: GitRunner = defaultRunner
): Promise<string | null> {
  try {
    const { stdout } = await runner.run(dir, ['rev-parse', '--show-toplevel'])
    const root = stdout.trim()
    return root ? normalize(root) : null
  } catch (error) {
    if (error instanceof GitError) return null
    throw error
  }
}
