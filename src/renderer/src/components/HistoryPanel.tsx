import type { Commit } from '@shared/types'
import { parseRef, relativeTime } from '../format'

export function HistoryPanel({ commits }: { commits: Commit[] }) {
  if (commits.length === 0) {
    return (
      <div className="empty empty--inline">
        <p className="empty__title">No commits yet</p>
        <p className="empty__body">
          Stage some files and make your first commit to start the history.
        </p>
      </div>
    )
  }

  return (
    <ol className="history__list">
      {commits.map((commit) => (
        <li key={commit.hash} className="commit">
          <div className="commit__top">
            <span className="commit__subject">{commit.subject || '(no message)'}</span>
            {commit.refs.map((ref) => {
              const { label, kind } = parseRef(ref)
              return (
                <span key={ref} className={`ref ref--${kind}`}>
                  {label}
                </span>
              )
            })}
          </div>
          <div className="commit__meta">
            <span className="commit__author">{commit.authorName}</span>
            <span className="commit__when">{relativeTime(commit.authoredAt)}</span>
            <code className="commit__hash">{commit.shortHash}</code>
          </div>
        </li>
      ))}
    </ol>
  )
}
