# Contributing

Thanks for helping with Handrail.

## Setup

```sh
npm install
npm run dev
```

Before opening a pull request, make sure these pass:

```sh
npm run format:check
npm run typecheck
npm test
npm run build
```

## Adding an action

An action is anything the app does to a repository. To add one:

1. Add a variant to `ActionRequest` in `src/shared/types.ts`.
2. Add its plain-English preview in `src/main/actions/describe.ts`. Say what will happen, and what
   will _not_ change. Include the Git command it runs.
3. Run it in `execute()` in `src/main/actions/operation-log.ts`, and make sure it can be undone.
   If it cannot, set `reversible: false` in the preview and ask for confirmation in the UI.
4. Allow the new type in `assertRequest()` in `src/main/ipc.ts`.
5. Add a button in the renderer that sends the request.
6. Add tests in `tests/`. Use `createTempRepo()` to test against a real repository.

## Principles

- **Plain English first.** Interface text describes what happens to the person's work, not how Git
  is built. Sentence case, active voice, and buttons say what they do.
- **Nothing is final.** Prefer actions that can be undone. Say so when one cannot.
- **Git is the source of truth.** Shell out to the installed `git`. Do not reimplement it.
- **Parse stable output.** Use porcelain formats and `-z`, never output meant for humans.
- **Test against real repositories.** Parsers get unit tests; behaviour gets integration tests.

## Security

The renderer is untrusted. Keep `contextIsolation` and `sandbox` on, never add `nodeIntegration`,
and validate every argument that arrives over IPC. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Licence

By contributing you agree that your contributions are licensed under the [MIT licence](LICENSE).
