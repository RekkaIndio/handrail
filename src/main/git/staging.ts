import { defaultRunner, type GitRunner } from './runner'

/**
 * Paths are passed on stdin, NUL-separated, so a large selection cannot overflow the command line
 * limit (a real problem on Windows). `--literal-pathspecs` stops names like "*.ts" or ":(top)x"
 * from being treated as patterns.
 */
function pathspecArgs(command: string[]): string[] {
  return ['--literal-pathspecs', ...command, '--pathspec-from-file=-', '--pathspec-file-nul']
}

function toStdin(paths: readonly string[]): string {
  return paths.join('\0') + '\0'
}

export async function stageFiles(
  root: string,
  paths: readonly string[],
  runner: GitRunner = defaultRunner
): Promise<void> {
  if (paths.length === 0) return
  await runner.run(root, pathspecArgs(['add']), { stdin: toStdin(paths) })
}

export async function unstageFiles(
  root: string,
  paths: readonly string[],
  runner: GitRunner = defaultRunner
): Promise<void> {
  if (paths.length === 0) return
  await runner.run(root, pathspecArgs(['reset', '-q']), { stdin: toStdin(paths) })
}

/**
 * Saves the current staging area as a tree object and returns its id, or null when that is not
 * possible (for example while a merge has unresolved conflicts). The tree is how an action is undone.
 */
export async function snapshotIndex(
  root: string,
  runner: GitRunner = defaultRunner
): Promise<string | null> {
  const { stdout, exitCode } = await runner.run(root, ['write-tree'], {
    allowedExitCodes: [0, 128]
  })
  return exitCode === 0 ? stdout.trim() : null
}

/** Puts the staging area back exactly as it was in a snapshot. The working folder is untouched. */
export async function restoreIndex(
  root: string,
  tree: string,
  runner: GitRunner = defaultRunner
): Promise<void> {
  await runner.run(root, ['read-tree', tree])
}
