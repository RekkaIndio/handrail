# Handrail

A desktop Git client where every action is a button.

Git is powerful, but most of it hides behind commands you have to remember and flags you have to
get right. Handrail puts the common work on screen as buttons, and holds the rest of the way:

- **Every action says what it will do, in plain English.** And it shows the real Git command, so
  you learn the command line by using the app instead of avoiding it.
- **Every action can be undone.** Handrail records what it does and puts things back exactly as
  they were.
- **It never guesses.** If something is risky or unclear, it tells you before it acts, not after.

It uses the Git you already have installed, so your config, hooks and credentials all work as usual.

## Status

Early development. The foundations are in place and the interesting parts are next.
See [ROADMAP.md](ROADMAP.md) for the full plan.

| Area                                       | State       |
| ------------------------------------------ | ----------- |
| Git layer: runner, status, history parsing | Working     |
| Stage and unstage files, with undo         | Working     |
| Commit graph                               | Not started |
| Hunk and line staging                      | Not started |
| Branches, merge, stash                     | Not started |
| Conflict resolver                          | Not started |
| Interactive rebase                         | Not started |
| Push, pull, clone                          | Not started |

## Getting started

You need [Node.js](https://nodejs.org) 22.12 or newer and [Git](https://git-scm.com) on your PATH.

```sh
git clone https://github.com/RekkaIndio/handrail.git
cd handrail
npm install
npm run dev
```

Then choose **Open repository** and pick any folder that contains a Git repository.

## Scripts

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the app with hot reload                |
| `npm run build`     | Build the main, preload and renderer bundles |
| `npm test`          | Run the tests (they create real temp repos)  |
| `npm run typecheck` | Check types for the main and renderer sides  |
| `npm run format`    | Format the code with Prettier                |

## How it works

Handrail is an Electron app written in TypeScript with a React interface. The renderer never
touches Git or the file system. It sends typed requests to the main process, which runs Git and
sends back results.

```
renderer (React)  ──  window.handrail  ──  main process  ──  git
   buttons             typed IPC bridge     actions, undo       your Git install
```

Each thing the app can do is an _action_: a request, a plain-English preview, a run, and a record
that can be undone. Adding a feature means adding an action. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and the reasons behind it.

## Project layout

```
src/
  main/        Electron main process
    git/       Git runner and parsers (status, log, staging)
    actions/   Action previews and the undoable operation log
  preload/     The small, typed bridge exposed to the UI
  renderer/    React interface
  shared/      Types and the IPC contract used by all three
tests/         Parser tests and integration tests against real temp repositories
docs/          Architecture notes
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE) © 2026 Jamie Mason-Wright
