# Roadmap

Handrail is built in milestones. Each one ends with something usable and tested. Hour estimates are
for planning, not promises.

Legend: `[x]` done, `[ ]` to do.

## 1. Git layer (about 8h)

The typed foundation everything else stands on.

- [x] Runner with a per-repository queue, timeouts and a clear "Git not installed" error
- [x] Status parser for `status --porcelain=v2 -z`, including renames and conflicts
- [x] History parser for `log`
- [x] Integration tests against real temporary repositories
- [ ] File watcher with debouncing, replacing refresh-on-focus
- [ ] Fast object reads through a long-lived `cat-file --batch` process
- [ ] Cancel long-running commands

## 2. Commit graph (about 8h)

- [ ] Lane assignment algorithm for the commit DAG (branches and merges drawn as lanes)
- [ ] Virtualised rendering that stays smooth on repositories with 100,000+ commits
- [ ] Incremental loading while scrolling
- [ ] Commit detail panel with changed files
- [ ] Benchmarks against a large real repository

## 3. Staging and committing (about 8h)

- [x] Stage and unstage whole files, with undo
- [ ] Diff viewer
- [ ] Hunk staging
- [ ] Line staging, by generating patches and applying them with `git apply --cached`
- [ ] Commit button with a message box, and amend

## 4. Branches (about 6h)

- [ ] Create, switch, rename and delete branches
- [ ] Merge, with a preview of conflicts before anything changes (`git merge-tree --write-tree`)
- [ ] Stash and restore, with names
- [ ] Safe handling when switching with uncommitted changes

## 5. Conflict resolver (about 8h)

- [ ] Three-way merge editor: yours, theirs and the result
- [ ] Accept yours, accept theirs, or edit, per conflict block
- [ ] Mark resolved and continue the merge

## 6. Interactive rebase (about 8h)

- [ ] Drag to reorder commits
- [ ] Buttons to squash, reword, drop and split, instead of editing a todo file
- [ ] Preview the result before running
- [ ] Recover from a failed rebase in one click

## 7. Undo and the time machine (about 5h)

- [x] In-memory operation log, with undo of staging actions by restoring a saved staging area
- [x] Refuses to undo if the staging area was changed outside Handrail
- [ ] Persist the operation log between sessions
- [ ] Undo commits, merges and rebases using the reflog
- [ ] A "time machine" view of past states of the repository

## 8. Remotes (about 4h)

- [ ] Clone, fetch, pull and push
- [ ] Force push replaced by a safe `--force-with-lease` flow, explained in plain English
- [ ] Authentication through the system credential helper (Handrail stores no credentials)

## 9. Testing and release (about 6h)

- [x] CI: format, typecheck, tests and build on every push
- [ ] End-to-end tests of the UI with Playwright for Electron
- [ ] Tests on Windows and macOS in CI
- [ ] Installers for Windows, macOS and Linux
- [ ] Documentation with screenshots

## Later

Ideas that are not planned yet: worktrees, submodules, tags and releases, a search across history,
and keyboard shortcuts for everything.
