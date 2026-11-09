import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { devNull, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// Make Git deterministic and independent of the machine running the tests. The app's own runner
// inherits these because it spawns Git with the current environment.
Object.assign(process.env, {
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test Author',
  GIT_AUTHOR_EMAIL: 'author@example.com',
  GIT_COMMITTER_NAME: 'Test Author',
  GIT_COMMITTER_EMAIL: 'author@example.com'
})

export interface TempRepo {
  root: string
  /** Runs Git directly (not through the app) and returns stdout. */
  git(...args: string[]): string
  write(path: string, content?: string): Promise<void>
  commitAll(message: string): void
  remove(): Promise<void>
}

export async function createTempRepo(): Promise<TempRepo> {
  // realpath: on macOS the temp folder is a symlink and Git reports the resolved path.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'handrail-test-')))
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' })

  git('init', '-q', '-b', 'main')

  return {
    root,
    git,
    async write(path, content = `${path}\n`) {
      const full = join(root, path)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, content)
    },
    commitAll(message) {
      git('add', '-A')
      git('commit', '-q', '-m', message)
    },
    async remove() {
      await rm(root, { recursive: true, force: true })
    }
  }
}
