import { describe, expect, it } from 'vitest'
import { parseLog } from '../src/main/git/log'

const F = '\x1f'
const R = '\x1e'
const record = (...fields: string[]): string => fields.join(F) + R

describe('parseLog', () => {
  it('parses commits, parents, refs and subjects', () => {
    const hashA = 'a'.repeat(40)
    const hashB = 'b'.repeat(40)
    const hashC = 'c'.repeat(40)
    const output =
      record(
        hashA,
        `${hashB} ${hashC}`,
        'Ada',
        'ada@example.com',
        '1700000000',
        'HEAD -> main, origin/main, tag: v1',
        'Merge feature'
      ) +
      '\n' +
      record(hashB, '', 'Grace', 'grace@example.com', '1690000000', '', 'First commit')

    const commits = parseLog(output)
    expect(commits).toHaveLength(2)
    expect(commits[0]).toEqual({
      hash: hashA,
      shortHash: 'aaaaaaa',
      parents: [hashB, hashC],
      authorName: 'Ada',
      authorEmail: 'ada@example.com',
      authoredAt: 1700000000,
      refs: ['HEAD -> main', 'origin/main', 'tag: v1'],
      subject: 'Merge feature'
    })
    expect(commits[1]?.parents).toEqual([])
    expect(commits[1]?.refs).toEqual([])
  })

  it('keeps subjects that contain punctuation', () => {
    const [commit] = parseLog(
      record('d'.repeat(40), '', 'A', 'a@b.c', '1', '', 'fix: handle "quotes", commas & tabs\t')
    )
    expect(commit?.subject).toBe('fix: handle "quotes", commas & tabs\t')
  })

  it('returns an empty list for empty output', () => {
    expect(parseLog('')).toEqual([])
  })
})
