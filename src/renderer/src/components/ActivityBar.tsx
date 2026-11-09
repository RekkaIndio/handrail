import type { Notice } from '../useRepository'

interface Props {
  notice: Notice | null
  busy: boolean
  onUndo(id: string): void
  onDismiss(): void
}

export function ActivityBar({ notice, busy, onUndo, onDismiss }: Props) {
  if (!notice) return null

  if (notice.kind === 'error') {
    const { message, command, stderr } = notice.error
    return (
      <aside className="activity activity--error" role="alert">
        <div className="activity__text">
          <p className="activity__title">That did not work</p>
          <p className="activity__summary">{message}</p>
          {(command || stderr) && (
            <details className="activity__details">
              <summary>Show details</summary>
              {command && <code className="activity__command">{command}</code>}
              {stderr && <pre className="activity__stderr">{stderr.trim()}</pre>}
            </details>
          )}
        </div>
        <button type="button" className="button button--small" onClick={onDismiss}>
          Dismiss
        </button>
      </aside>
    )
  }

  const { operation } = notice
  const undone = notice.kind === 'undone'
  return (
    <aside className="activity" role="status">
      <div className="activity__text">
        <p className="activity__title">
          {undone ? `Undone: ${operation.preview.title}` : operation.preview.title}
        </p>
        <p className="activity__summary">{operation.preview.summary}</p>
        <details className="activity__details">
          <summary>Show the Git command</summary>
          {operation.preview.gitCommands.map((command) => (
            <code key={command} className="activity__command">
              {command}
            </code>
          ))}
        </details>
      </div>
      {!undone && operation.undoable && operation.status === 'done' && (
        <button
          type="button"
          className="button button--primary button--small"
          disabled={busy}
          onClick={() => onUndo(operation.id)}
        >
          Undo
        </button>
      )}
      <button type="button" className="button button--small" onClick={onDismiss}>
        Dismiss
      </button>
    </aside>
  )
}
