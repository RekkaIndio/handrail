import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OperationLog, describeAction, listPaths } from '../src/main/actions'
import { HandrailError } from '../src/main/errors'
import { GitRunner, getStatus } from '../src/main/git'
import { createTempRepo, type TempRepo } from './helpers/temp-repo'

const runner = new GitRunner()
let repo: TempRepo
let log: OperationLog

beforeEach(async () => {
  repo = await createTempRepo()
  log = new OperationLog(runner)
})
afterEach(async () => {
  await repo.remove()
})

const stagedPaths = async (): Promise<string[]> =>
  (await getStatus(repo.root, runner)).staged.map((c) => c.path)

describe('describeAction', () => {
  it('explains staging in plain English and shows the Git command', () => {
    const preview = describeAction({ type: 'stage', paths: ['src/app.ts'] })
    expect(preview.title).toBe('Stage 1 file')
    expect(preview.summary).toContain('src/app.ts')
    expect(preview.summary).toContain('next commit')
    expect(preview.gitCommands).toEqual(['git add -- src/app.ts'])
    expect(preview.reversible).toBe(true)
  })

  it('reassures the person that unstaging keeps their edits', () => {
    const preview = describeAction({ type: 'unstage', paths: ['a.txt', 'b.txt'] })
    expect(preview.title).toBe('Unstage 2 files')
    expect(preview.summary).toContain('Your edits stay')
  })

  it('quotes awkward paths in the displayed command', () => {
    const [command] = describeAction({ type: 'stage', paths: ['my notes.txt'] }).gitCommands
    expect(command).toBe("git add -- 'my notes.txt'")
  })
})

describe('listPaths', () => {
  it('joins short lists naturally and truncates long ones', () => {
    expect(listPaths(['a'])).toBe('a')
    expect(listPaths(['a', 'b'])).toBe('a and b')
    expect(listPaths(['a', 'b', 'c'])).toBe('a, b and c')
    expect(listPaths(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c and 2 more')
  })
})

describe('OperationLog', () => {
  it('performs an action, records it, and undoes it exactly', async () => {
    await repo.write('kept.txt')
    await repo.write('new.txt')
    repo.git('add', 'kept.txt') // already staged before the app does anything

    const op = await log.perform(repo.root, { type: 'stage', paths: ['new.txt'] })
    expect(op.status).toBe('done')
    expect(op.undoable).toBe(true)
    expect((await stagedPaths()).sort()).toEqual(['kept.txt', 'new.txt'])

    const undone = await log.undo(repo.root, op.id)
    expect(undone.status).toBe('undone')
    // new.txt is gone from the staging area, but kept.txt is still staged.
    expect(await stagedPaths()).toEqual(['kept.txt'])
  })

  it('undoes an unstage and restores the staged state', async () => {
    await repo.write('a.txt')
    repo.commitAll('base')
    await repo.write('a.txt', 'changed\n')
    repo.git('add', 'a.txt')

    const op = await log.perform(repo.root, { type: 'unstage', paths: ['a.txt'] })
    expect(await stagedPaths()).toEqual([])
    await log.undo(repo.root, op.id)
    expect(await stagedPaths()).toEqual(['a.txt'])
  })

  it('lists operations newest first', async () => {
    await repo.write('a.txt')
    await repo.write('b.txt')
    await log.perform(repo.root, { type: 'stage', paths: ['a.txt'] })
    await log.perform(repo.root, { type: 'stage', paths: ['b.txt'] })
    expect(log.list(repo.root).map((o) => o.preview.summary)).toEqual([
      expect.stringContaining('b.txt'),
      expect.stringContaining('a.txt')
    ])
  })

  it('makes you undo the newest action first', async () => {
    await repo.write('a.txt')
    await repo.write('b.txt')
    const first = await log.perform(repo.root, { type: 'stage', paths: ['a.txt'] })
    const second = await log.perform(repo.root, { type: 'stage', paths: ['b.txt'] })

    await expect(log.undo(repo.root, first.id)).rejects.toThrow(/more recent/)
    await log.undo(repo.root, second.id)
    await log.undo(repo.root, first.id)
    expect(await stagedPaths()).toEqual([])
  })

  it('refuses to undo when the staging area changed outside the app', async () => {
    await repo.write('a.txt')
    await repo.write('b.txt')
    const op = await log.perform(repo.root, { type: 'stage', paths: ['a.txt'] })
    repo.git('add', 'b.txt') // someone stages another file in a terminal

    await expect(log.undo(repo.root, op.id)).rejects.toThrow(/outside Handrail/)
    expect((await stagedPaths()).sort()).toEqual(['a.txt', 'b.txt']) // nothing was lost
  })

  it('refuses to undo the same action twice', async () => {
    await repo.write('a.txt')
    const op = await log.perform(repo.root, { type: 'stage', paths: ['a.txt'] })
    await log.undo(repo.root, op.id)
    await expect(log.undo(repo.root, op.id)).rejects.toThrow(/already undone/)
  })

  it('rejects an empty selection and an unknown id', async () => {
    await expect(log.perform(repo.root, { type: 'stage', paths: [] })).rejects.toBeInstanceOf(
      HandrailError
    )
    await expect(log.undo(repo.root, 'nope')).rejects.toBeInstanceOf(HandrailError)
  })

  it('keeps separate histories per repository', async () => {
    const other = await createTempRepo()
    try {
      await repo.write('a.txt')
      await log.perform(repo.root, { type: 'stage', paths: ['a.txt'] })
      expect(log.list(repo.root)).toHaveLength(1)
      expect(log.list(other.root)).toHaveLength(0)
    } finally {
      await other.remove()
    }
  })
})
