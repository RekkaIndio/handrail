import type { ActionPreview, ActionRequest } from '@shared/types'

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** "a.txt", "a.txt and b.txt", "a.txt, b.txt and c.txt", "a.txt, b.txt, c.txt and 4 more". */
export function listPaths(paths: readonly string[], max = 3): string {
  if (paths.length <= max) {
    if (paths.length <= 1) return paths[0] ?? ''
    return `${paths.slice(0, -1).join(', ')} and ${paths[paths.length - 1]}`
  }
  return `${paths.slice(0, max).join(', ')} and ${paths.length - max} more`
}

/** Shell-quotes a path for display only. These strings are never executed. */
function quote(path: string): string {
  return /^[\w./@+-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`
}

function commandFor(verb: string, paths: readonly string[]): string {
  const shown = paths.slice(0, 5).map(quote).join(' ')
  const suffix = paths.length > 5 ? ` … (${paths.length - 5} more)` : ''
  return `git ${verb} -- ${shown}${suffix}`
}

/** Describes what an action will do, without touching the repository. */
export function describeAction(request: ActionRequest): ActionPreview {
  const count = request.paths.length
  const files = plural(count, 'file', 'files')

  switch (request.type) {
    case 'stage':
      return {
        title: `Stage ${files}`,
        summary: `Adds ${listPaths(request.paths)} to your next commit. Your files are not changed.`,
        gitCommands: [commandFor('add', request.paths)],
        reversible: true
      }
    case 'unstage':
      return {
        title: `Unstage ${files}`,
        summary: `Removes ${listPaths(request.paths)} from your next commit. Your edits stay in your files.`,
        gitCommands: [commandFor('reset', request.paths)],
        reversible: true
      }
  }
}
