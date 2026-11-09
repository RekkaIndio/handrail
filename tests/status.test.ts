import { describe, expect, it } from 'vitest'
import { parseStatus } from '../src/main/git/status'

const OID = '1'.repeat(40)
const lines = (...entries: string[]): string => entries.join('\0') + '\0'

describe('parseStatus', () => {
  it('reads branch headers, including upstream and ahead/behind counts', () => {
    const status = parseStatus(
      lines(
        `# branch.oid ${OID}`,
        '# branch.head feature/login',
        '# branch.upstream origin/feature/login',
        '# branch.ab +2 -5'
      )
    )
    expect(status.branch).toEqual({
      oid: OID,
      head: 'feature/login',
      detached: false,
      upstream: 'origin/feature/login',
      ahead: 2,
      behind: 5
    })
    expect(status.isClean).toBe(true)
  })

  it('handles a repository with no commits yet', () => {
    const status = parseStatus(lines('# branch.oid (initial)', '# branch.head main'))
    expect(status.branch.oid).toBeNull()
    expect(status.branch.head).toBe('main')
  })

  it('handles a detached HEAD', () => {
    const status = parseStatus(lines(`# branch.oid ${OID}`, '# branch.head (detached)'))
    expect(status.branch.detached).toBe(true)
    expect(status.branch.head).toBeNull()
  })

  it('splits changes into staged and unstaged, and a file can be in both', () => {
    const entry = (xy: string, path: string): string =>
      `1 ${xy} N... 100644 100644 100644 ${OID} ${OID} ${path}`
    const status = parseStatus(
      lines(entry('.M', 'only-edited.ts'), entry('A.', 'only-staged.ts'), entry('MM', 'both.ts'))
    )
    expect(status.staged).toEqual([
      { path: 'only-staged.ts', kind: 'added' },
      { path: 'both.ts', kind: 'modified' }
    ])
    expect(status.unstaged).toEqual([
      { path: 'only-edited.ts', kind: 'modified' },
      { path: 'both.ts', kind: 'modified' }
    ])
    expect(status.isClean).toBe(false)
  })

  it('keeps spaces in file names', () => {
    const status = parseStatus(
      lines(`1 .D N... 100644 100644 000000 ${OID} ${OID} docs/old notes (final).md`)
    )
    expect(status.unstaged).toEqual([{ path: 'docs/old notes (final).md', kind: 'deleted' }])
  })

  it('reads a rename together with its original path', () => {
    const status = parseStatus(
      lines(`2 R. N... 100644 100644 100644 ${OID} ${OID} R100 new name.txt`, 'old name.txt')
    )
    expect(status.staged).toEqual([
      { path: 'new name.txt', kind: 'renamed', originalPath: 'old name.txt' }
    ])
    expect(status.unstaged).toEqual([])
  })

  it('does not lose the entries that follow a rename', () => {
    const status = parseStatus(
      lines(`2 R. N... 100644 100644 100644 ${OID} ${OID} R100 b.txt`, 'a.txt', '? untracked.txt')
    )
    expect(status.untracked).toEqual(['untracked.txt'])
  })

  it('reports conflicts and untracked files', () => {
    const status = parseStatus(
      lines(
        `u UU N... 100644 100644 100644 100644 ${OID} ${OID} ${OID} merge me.txt`,
        '? notes/',
        '? scratch.txt',
        '! ignored.log'
      )
    )
    expect(status.conflicted).toEqual([{ path: 'merge me.txt', kind: 'conflicted' }])
    expect(status.untracked).toEqual(['notes/', 'scratch.txt'])
  })

  it('treats empty output as a clean repository', () => {
    expect(parseStatus('').isClean).toBe(true)
  })
})
