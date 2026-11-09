import type { RepoStatus } from '@shared/types'
import { describeSync, repoName } from '../format'

interface Props {
  root: string | null
  status: RepoStatus | null
  onOpen(): void
}

export function Toolbar({ root, status, onOpen }: Props) {
  const branch = status?.branch
  const sync = branch ? describeSync(branch) : null

  return (
    <header className="toolbar">
      <div className="toolbar__repo">
        <h1 className="toolbar__name" title={root ?? undefined}>
          {root ? repoName(root) : 'Handrail'}
        </h1>
        {branch && (
          <p className="toolbar__branch">
            <span className="branch-chip">
              {branch.detached ? 'Detached HEAD' : (branch.head ?? 'No commits yet')}
            </span>
            {sync && <span className="toolbar__sync">{sync}</span>}
          </p>
        )}
      </div>
      <button type="button" className="button" onClick={onOpen}>
        Open repository
      </button>
    </header>
  )
}
