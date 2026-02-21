# Issues

## 2026-02-21 Task 1

- `pnpm exec tsc --noEmit` currently fails with a large set of pre-existing repository-wide TypeScript errors unrelated to this task (strict null checks/implicit any/etc. across many files).
- This task-level change is verified via Playwright scenarios and targeted runtime checks, but global typecheck remains blocked by baseline project state.

## 2026-02-21 Task 2

- `pnpm exec tsc --noEmit` still fails with pre-existing repository baseline TypeScript errors (captured in `.sisyphus/evidence/task-2-tsc.txt`); Task 2 validation relied on successful `pnpm build`, clean LSP diagnostics for changed files, targeted evidence checks, and runtime screenshot proof.

## 2026-02-21 Task 7

- `pnpm exec tsc --noEmit` continues to fail due to pre-existing repo-wide baseline TypeScript errors unrelated to the inventory scope; Task 7 validation used targeted inventory QA scenarios, clean LSP diagnostics on changed files, and successful `pnpm build`.

## 2026-02-21 Task 9

- Running ad-hoc `pnpm exec tsc` for temporary QA compilation hit a baseline `AbortSignal` DOM/Node lib conflict; adding `--skipLibCheck true` for the isolated mock-compile path was required for deterministic evidence scripting.
- Client bridge LLM calls intentionally fall back to stub idle output when no client API key is present, so simulation ticks remain non-blocking in existing default local runs.

## 2026-02-21 Task 10

- Deterministic evidence scripts for Task 10 also require isolated TypeScript compilation with `--skipLibCheck true` to avoid unrelated baseline typing conflicts during temporary CommonJS QA builds.

## 2026-02-21 Task 8

- Deterministic Task 8 evidence execution also uses isolated simulation compilation (`pnpm exec tsc ... --skipLibCheck true --outDir .sisyphus/tmp/task8-sim`) to avoid unrelated repository-wide typing noise during Node-based QA scripts.

## 2026-02-21 Task 11

- Task 11 deterministic evidence also requires isolated simulation compilation with `--skipLibCheck true` (`.sisyphus/tmp/task11-sim`) to avoid pre-existing repository-wide TypeScript baseline noise.

## 2026-02-21 Task 13

- Task 13 deterministic evidence similarly uses isolated TypeScript compilation to `.sisyphus/tmp/task13-validation` with `--skipLibCheck true` so evidence generation is not blocked by unrelated repository-wide typing baseline errors.

## 2026-02-21 Task 14

- During automated browser verification, one early multi-step Playwright interaction crashed the page; using a single consolidated `browser_run_code` scenario produced stable deterministic possession/pause/release evidence.
- Dev runtime still emits a known baseline `registerSW.js` 404 console error in local Vite runs; it is unrelated to possession behavior and does not block Task 14 acceptance flows.
