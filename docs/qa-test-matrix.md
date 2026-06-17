# QA Test Matrix

Last reviewed: 2026-06-17

This matrix documents the runnable QA surface for the VHV TV Panel monorepo. Commands are intended to be run from the repository root unless noted otherwise.

| Area                                                      | Command             | Coverage                                                                                                                                                                                                                          | Current result                                                                                                                              |
| --------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit, integration, API, worker, frontend, and smoke tests | `pnpm test`         | Runs every workspace package test script, including package unit tests, API route/security/rate-limit tests, monitoring worker scheduler/importer/FFmpeg/Telegram tests, UI token tests, and frontend component/page smoke tests. | Passing                                                                                                                                     |
| Static type checking                                      | `pnpm typecheck`    | Runs TypeScript checks for shared packages, API, worker, and frontend workspaces.                                                                                                                                                 | Passing                                                                                                                                     |
| Linting                                                   | `pnpm lint`         | Runs ESLint across the monorepo.                                                                                                                                                                                                  | Passing                                                                                                                                     |
| Production build                                          | `pnpm build`        | Builds packages, API, worker, and the Next.js frontend production bundle.                                                                                                                                                         | Passing; Next.js reports the existing informational warning that the Next.js ESLint plugin is not configured.                               |
| Formatting                                                | `pnpm format:check` | Checks Prettier formatting across the monorepo.                                                                                                                                                                                   | Failing on pre-existing repository-wide formatting drift across 60 files; do not use this as a release gate until formatting is normalized. |

## E2E smoke coverage

There is no dedicated Playwright or Cypress E2E command configured in the current package scripts. The active smoke coverage is provided by `apps/web/src/__tests__/pages-smoke.test.tsx`, which imports the frontend app and layout modules under Vitest/jsdom as part of `pnpm test`.

## Notes for QA workers

- Use `pnpm test` as the primary regression command because it exercises all configured workspace test scripts.
- Use `pnpm typecheck`, `pnpm lint`, and `pnpm build` before handoff to cover the non-test QA gates.
- Treat `pnpm format:check` as a known warning until the existing formatting baseline is fixed in a dedicated formatting-only change.
