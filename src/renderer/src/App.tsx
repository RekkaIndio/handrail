import { ActivityBar } from './components/ActivityBar'
import { ChangesPanel } from './components/ChangesPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { Toolbar } from './components/Toolbar'
import { useRepository } from './useRepository'

export function App() {
  const repo = useRepository()

  return (
    <div className="app">
      <Toolbar root={repo.root} status={repo.status} onOpen={repo.open} />

      {repo.root && repo.status ? (
        <main className="workspace">
          <section className="panel panel--changes" aria-label="Changes">
            <ChangesPanel status={repo.status} busy={repo.busy} onRun={repo.run} />
          </section>
          <section className="panel panel--history" aria-label="History">
            <HistoryPanel commits={repo.commits} />
          </section>
        </main>
      ) : (
        <main className="empty">
          <p className="empty__title">Open a repository to get started</p>
          <p className="empty__body">
            Choose the folder that contains your project. Handrail shows what changed and lets you
            work with buttons instead of commands.
          </p>
          <button type="button" className="button button--primary" onClick={repo.open}>
            Open repository
          </button>
        </main>
      )}

      <ActivityBar
        notice={repo.notice}
        busy={repo.busy}
        onUndo={repo.undo}
        onDismiss={repo.dismissNotice}
      />
    </div>
  )
}
