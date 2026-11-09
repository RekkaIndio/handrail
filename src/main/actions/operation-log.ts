import { randomUUID } from 'node:crypto'
import type { ActionRequest, OperationRecord } from '@shared/types'
import { HandrailError } from '../errors'
import {
  defaultRunner,
  restoreIndex,
  snapshotIndex,
  stageFiles,
  unstageFiles,
  type GitRunner
} from '../git'
import { describeAction } from './describe'

interface StoredOperation extends OperationRecord {
  /** The staging area before the action, or null if it could not be saved. */
  treeBefore: string | null
  /** The staging area right after the action. Used to detect outside changes before undoing. */
  treeAfter: string | null
}

function toRecord(op: StoredOperation): OperationRecord {
  const { id, at, preview, status, undoable } = op
  return { id, at, preview, status, undoable }
}

async function execute(root: string, request: ActionRequest, runner: GitRunner): Promise<void> {
  switch (request.type) {
    case 'stage':
      return stageFiles(root, request.paths, runner)
    case 'unstage':
      return unstageFiles(root, request.paths, runner)
  }
}

/**
 * Records every action the app performs and can undo them, newest first.
 *
 * Staging actions are undone by restoring a saved copy of the staging area. Later milestones
 * (commit, merge, rebase) will do the same with the reflog. The log lives in memory for now;
 * persisting it is on the roadmap.
 */
export class OperationLog {
  private readonly byRepo = new Map<string, StoredOperation[]>()

  constructor(private readonly runner: GitRunner = defaultRunner) {}

  list(root: string): OperationRecord[] {
    return [...(this.byRepo.get(root) ?? [])].reverse().map(toRecord)
  }

  async perform(root: string, request: ActionRequest): Promise<OperationRecord> {
    if (request.paths.length === 0) throw new HandrailError('Choose at least one file first.')

    const treeBefore = await snapshotIndex(root, this.runner)
    await execute(root, request, this.runner)
    const treeAfter = treeBefore ? await snapshotIndex(root, this.runner) : null

    const operation: StoredOperation = {
      id: randomUUID(),
      at: Date.now(),
      preview: describeAction(request),
      status: 'done',
      undoable: treeBefore !== null && treeAfter !== null,
      treeBefore,
      treeAfter
    }
    const history = this.byRepo.get(root) ?? []
    history.push(operation)
    this.byRepo.set(root, history)
    return toRecord(operation)
  }

  async undo(root: string, id: string): Promise<OperationRecord> {
    const history = this.byRepo.get(root) ?? []
    const operation = history.find((op) => op.id === id)
    if (!operation) throw new HandrailError('That action is no longer in the history.')
    if (operation.status === 'undone') throw new HandrailError('That action was already undone.')
    if (!operation.undoable || operation.treeBefore === null) {
      throw new HandrailError('This action cannot be undone automatically.')
    }

    const newerPending = history
      .slice(history.indexOf(operation) + 1)
      .some((op) => op.status === 'done')
    if (newerPending) throw new HandrailError('Undo your more recent actions first.')

    const current = await snapshotIndex(root, this.runner)
    if (current !== operation.treeAfter) {
      throw new HandrailError(
        'The staging area was changed outside Handrail since this action, so undoing it could discard that work.'
      )
    }

    await restoreIndex(root, operation.treeBefore, this.runner)
    operation.status = 'undone'
    return toRecord(operation)
  }
}
