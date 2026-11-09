import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  GitRunner,
  getLog,
  getStatus,
  resolveRepoRoot,
  stageFiles,
  unstageFiles
} from '../src/main/git'
import { createTempRepo, type TempRepo } from './helpers/temp-repo'

const runner = new GitRunner()
let repo: TempRepo

beforeEach(async () => {
  repo = await createTempRepo()
})
afterEach(async () => {
  await repo.remove()
})

describe('resolveRepoRoot', () => {
  it('finds the root from a subfolder', async () => {
    await repo.write('src/deep/file.txt')
    expect(await resolveRepoRoot(`${repo.root}/src/deep`, runner)).toBe(repo.root)
  })
})

describe('getStatus', () => {
  it('reports an empty repository as clean', async () => {
    const status = await getStatus(repo.root, runner)
    expect(status.isClean).toBe(true)
    expect(status.branch.head).toBe('main')
    expect(status.branch.oid).toBeNull()
  })

  it('follows a file from untracked to staged to modified', async () => {
    await repo.write('a.txt', 'one\n')
    expect((await getStatus(repo.root, runner)).untracked).toEqual(['a.txt'])

    await stageFiles(repo.root, ['a.txt'], runner)
    expect((await getStatus(repo.root, runner)).staged).toEqual([{ path: 'a.txt', kind: 'added' }])

    repo.commitAll('add a')
    await repo.write('a.txt', 'two\n')
    const status = await getStatus(repo.root, runner)
    expect(status.unstaged).toEqual([{ path: 'a.txt', kind: 'modified' }])
    expect(status.branch.oid).not.toBeNull()
  })

  it('detects staged renames', async () => {
    await repo.write('old.txt', 'a long enough body so the rename is detected\n'.repeat(5))
    repo.commitAll('add')
    repo.git('mv', 'old.txt', 'new.txt')
    const { staged } = await getStatus(repo.root, runner)
    expect(staged).toEqual([{ path: 'new.txt', kind: 'renamed', originalPath: 'old.txt' }])
  })

  it('handles spaces and non-ASCII characters in file names', async () => {
    await repo.write('notes/résumé draft.txt')
    expect((await getStatus(repo.root, runner)).untracked).toEqual(['notes/'])
    await stageFiles(repo.root, ['notes/résumé draft.txt'], runner)
    expect((await getStatus(repo.root, runner)).staged).toEqual([
      { path: 'notes/résumé draft.txt', kind: 'added' }
    ])
  })

  it('lists a merge conflict as conflicted', async () => {
    await repo.write('c.txt', 'base\n')
    repo.commitAll('base')
    repo.git('switch', '-q', '-c', 'other')
    await repo.write('c.txt', 'other\n')
    repo.commitAll('other change')
    repo.git('switch', '-q', 'main')
    await repo.write('c.txt', 'main\n')
    repo.commitAll('main change')
    try {
      repo.git('merge', 'other')
    } catch {
      // The merge is expected to stop on a conflict.
    }
    const status = await getStatus(repo.root, runner)
    expect(status.conflicted).toEqual([{ path: 'c.txt', kind: 'conflicted' }])
  })
})

describe('staging', () => {
  it('treats paths literally, never as patterns', async () => {
    if (process.platform === 'win32') return // "*" is not a valid file name on Windows
    await repo.write('a.txt')
    await repo.write('b.txt')
    await repo.write('*')
    await stageFiles(repo.root, ['*'], runner)
    const status = await getStatus(repo.root, runner)
    expect(status.staged.map((c) => c.path)).toEqual(['*'])
    expect(status.untracked.sort()).toEqual(['a.txt', 'b.txt'])
  })

  it('stages thousands of files without hitting command-line limits', async () => {
    const paths = Array.from({ length: 2500 }, (_, i) => `bulk/file-${i}.txt`)
    await Promise.all(paths.map((p) => repo.write(p, 'x')))
    await stageFiles(repo.root, paths, runner)
    expect((await getStatus(repo.root, runner)).staged).toHaveLength(2500)
  })

  it('unstages in a repository that has no commits yet', async () => {
    await repo.write('first.txt')
    await stageFiles(repo.root, ['first.txt'], runner)
    await unstageFiles(repo.root, ['first.txt'], runner)
    const status = await getStatus(repo.root, runner)
    expect(status.staged).toEqual([])
    expect(status.untracked).toEqual(['first.txt'])
  })

  it('unstages a change but keeps the edit in the file', async () => {
    await repo.write('a.txt', 'v1\n')
    repo.commitAll('v1')
    await repo.write('a.txt', 'v2\n')
    await stageFiles(repo.root, ['a.txt'], runner)
    await unstageFiles(repo.root, ['a.txt'], runner)
    const status = await getStatus(repo.root, runner)
    expect(status.staged).toEqual([])
    expect(status.unstaged).toEqual([{ path: 'a.txt', kind: 'modified' }])
  })

  it('stages a deletion', async () => {
    await repo.write('gone.txt')
    repo.commitAll('add')
    await rm(join(repo.root, 'gone.txt'))
    expect((await getStatus(repo.root, runner)).unstaged).toEqual([
      { path: 'gone.txt', kind: 'deleted' }
    ])
    await stageFiles(repo.root, ['gone.txt'], runner)
    expect((await getStatus(repo.root, runner)).staged).toEqual([
      { path: 'gone.txt', kind: 'deleted' }
    ])
  })
})

describe('getLog', () => {
  it('returns an empty history for a repository with no commits', async () => {
    expect(await getLog(repo.root, {}, runner)).toEqual([])
  })

  it('returns newest first, with branch labels', async () => {
    await repo.write('a.txt')
    repo.commitAll('first')
    await repo.write('b.txt')
    repo.commitAll('second')
    repo.git('tag', 'v1')

    const commits = await getLog(repo.root, {}, runner)
    expect(commits.map((c) => c.subject)).toEqual(['second', 'first'])
    expect(commits[0]?.refs).toEqual(expect.arrayContaining(['HEAD -> main', 'tag: v1']))
    expect(commits[0]?.parents).toEqual([commits[1]?.hash])
    expect(commits[1]?.parents).toEqual([])
    expect(commits[0]?.authorName).toBe('Test Author')
  })

  it('respects the limit', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.write(`f${i}.txt`)
      repo.commitAll(`commit ${i}`)
    }
    expect(await getLog(repo.root, { limit: 2 }, runner)).toHaveLength(2)
  })
})
