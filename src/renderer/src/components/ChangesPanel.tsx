import type { ActionRequest, FileChange, RepoStatus } from '@shared/types'
import { KIND_LABEL, splitPath } from '../format'

interface Props {
  status: RepoStatus
  busy: boolean
  onRun(request: ActionRequest): void
}

type Tone = 'conflict' | 'staged' | 'changed' | 'new'

interface Row {
  path: string
  label: string
  was?: string
}

interface LaneProps {
  title: string
  hint: string
  tone: Tone
  rows: Row[]
  busy: boolean
  /** Button text and request for the whole section and for each row. Omit for read-only sections. */
  action?: { verb: 'stage' | 'unstage'; one: string; all: string }
  onRun(request: ActionRequest): void
}

function FileRow({
  row,
  action,
  busy,
  onRun
}: {
  row: Row
  action: LaneProps['action']
  busy: boolean
  onRun(request: ActionRequest): void
}) {
  const { dir, name } = splitPath(row.path)
  return (
    <li className="file">
      <span className="file__path" title={row.path}>
        <span className="file__dir">{dir}</span>
        <span className="file__name">{name}</span>
        {row.was && <span className="file__was">was {row.was}</span>}
      </span>
      <span className="file__kind">{row.label}</span>
      {action && (
        <button
          type="button"
          className="button button--small"
          disabled={busy}
          aria-label={`${action.one} ${row.path}`}
          onClick={() => onRun({ type: action.verb, paths: [row.path] })}
        >
          {action.one}
        </button>
      )}
    </li>
  )
}

function Lane({ title, hint, tone, rows, busy, action, onRun }: LaneProps) {
  if (rows.length === 0) return null
  return (
    <section className={`lane lane--${tone}`} aria-label={title}>
      <span className="lane__node" aria-hidden="true" />
      <header className="lane__header">
        <h2 className="lane__title">
          {title} <span className="lane__count">{rows.length}</span>
        </h2>
        {action && (
          <button
            type="button"
            className="button button--small"
            disabled={busy}
            onClick={() => onRun({ type: action.verb, paths: rows.map((r) => r.path) })}
          >
            {action.all}
          </button>
        )}
      </header>
      <p className="lane__hint">{hint}</p>
      <ul className="lane__files">
        {rows.map((row) => (
          <FileRow key={row.path} row={row} action={action} busy={busy} onRun={onRun} />
        ))}
      </ul>
    </section>
  )
}

const toRow = (change: FileChange): Row => ({
  path: change.path,
  label: KIND_LABEL[change.kind],
  was: change.originalPath
})

export function ChangesPanel({ status, busy, onRun }: Props) {
  if (status.isClean) {
    return (
      <div className="empty empty--inline">
        <p className="empty__title">Nothing to commit</p>
        <p className="empty__body">Edit a file in your editor and it will appear here.</p>
      </div>
    )
  }

  return (
    <div className="rail">
      <Lane
        title="Conflicts"
        hint="Git could not combine these automatically. Resolve them before committing."
        tone="conflict"
        rows={status.conflicted.map(toRow)}
        busy={busy}
        onRun={onRun}
      />
      <Lane
        title="Staged for next commit"
        hint="These changes will be saved in your next commit."
        tone="staged"
        rows={status.staged.map(toRow)}
        busy={busy}
        action={{ verb: 'unstage', one: 'Unstage', all: 'Unstage all' }}
        onRun={onRun}
      />
      <Lane
        title="Changes"
        hint="Edited in your folder, but not yet chosen for a commit."
        tone="changed"
        rows={status.unstaged.map(toRow)}
        busy={busy}
        action={{ verb: 'stage', one: 'Stage', all: 'Stage all' }}
        onRun={onRun}
      />
      <Lane
        title="New files"
        hint="Git is not tracking these yet."
        tone="new"
        rows={status.untracked.map((path) => ({ path, label: 'New' }))}
        busy={busy}
        action={{ verb: 'stage', one: 'Stage', all: 'Stage all' }}
        onRun={onRun}
      />
    </div>
  )
}
