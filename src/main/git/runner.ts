import { spawn } from 'node:child_process'
import { GitError, GitNotFoundError } from '../errors'

export interface GitRunOptions {
  /** Written to the process's stdin, then closed. */
  stdin?: string | Buffer
  /** Exit codes that are not treated as failures. Defaults to [0]. */
  allowedExitCodes?: readonly number[]
  timeoutMs?: number
}

export interface GitResult {
  stdout: string
  stderr: string
  exitCode: number
}

const DEFAULT_TIMEOUT_MS = 60_000

/** Settings that make Git's output stable and non-interactive. */
const BASE_ARGS = ['-c', 'color.ui=false', '-c', 'core.quotepath=false']
const BASE_ENV: NodeJS.ProcessEnv = {
  GIT_TERMINAL_PROMPT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  LC_MESSAGES: 'C',
  LANGUAGE: 'C'
}

function execGit(cwd: string, args: readonly string[], options: GitRunOptions): Promise<GitResult> {
  const allowed = options.allowedExitCodes ?? [0]
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return new Promise((resolve, reject) => {
    const fullArgs = [...BASE_ARGS, ...args]
    const child = spawn('git', fullArgs, {
      cwd,
      env: { ...process.env, ...BASE_ENV },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    })

    const out: Buffer[] = []
    const err: Buffer[] = []
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk))

    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      reject(error.code === 'ENOENT' ? new GitNotFoundError() : error)
    })

    // Writing to stdin of a process that exits early raises EPIPE; the exit code tells the story.
    child.stdin.on('error', () => undefined)
    child.stdin.end(options.stdin)

    child.on('close', (code) => {
      clearTimeout(timer)
      const stdout = Buffer.concat(out).toString('utf8')
      const stderr = Buffer.concat(err).toString('utf8')
      if (timedOut) {
        reject(
          new GitError(
            `Git took longer than ${timeoutMs / 1000}s and was stopped.`,
            args,
            code,
            stderr
          )
        )
        return
      }
      const exitCode = code ?? -1
      if (!allowed.includes(exitCode)) {
        const detail = stderr.trim().split('\n')[0] ?? ''
        reject(new GitError(detail || `Git exited with code ${exitCode}.`, args, exitCode, stderr))
        return
      }
      resolve({ stdout, stderr, exitCode })
    })
  })
}

/**
 * Runs Git commands one at a time per repository.
 *
 * Git guards the index with a lock file, so two commands touching the same repository at once
 * can fail with "index.lock exists". Queueing per directory avoids that without a global lock.
 */
export class GitRunner {
  private readonly tails = new Map<string, Promise<unknown>>()

  run(cwd: string, args: readonly string[], options: GitRunOptions = {}): Promise<GitResult> {
    const previous = this.tails.get(cwd) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(() => execGit(cwd, args, options))
    this.tails.set(cwd, next)
    void next
      .catch(() => undefined)
      .finally(() => {
        if (this.tails.get(cwd) === next) this.tails.delete(cwd)
      })
    return next
  }
}

export const defaultRunner = new GitRunner()
