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

## 2026-02-21 Task 11 Follow-up

- Isolated Task 11 evidence compilation still surfaces pre-existing `NPCActionValidationResult` narrowing errors in `src/simulation/npc-ai/decision-loop.ts`; behavior executor verification remains covered by deterministic gather/build Node scripts and successful `pnpm build`.

## 2026-02-21 Task 15

- In automated Playwright runs, synthetic key events did not always toggle observer mode reliably in this project’s pointer-lock gameplay flow; evidence capture depended on stabilized interaction timing and direct in-page event dispatch.

## 2026-02-21 Task 16

- Deterministic evidence generation through a temporary simulation compile still encounters pre-existing `NPCActionValidationResult` narrowing errors in `src/simulation/npc-ai/decision-loop.ts`; task evidence was produced via isolated monster-manager compilation path to avoid unrelated baseline typing noise.

## 2026-02-21 Task 12

- Playwright MCP had intermittent `Target crashed` failures during longer wait-heavy browser runs; a shorter deterministic interaction sequence (direct controller-driven positioning + dialogue trigger + immediate screenshot) was required for stable evidence capture.
- Local Vite runtime still reports the known `registerSW.js` 404 console error during QA runs; this baseline warning is unrelated to Task 12 dialogue functionality.

## 2026-02-21 Task 17

- Local dev runtime still emits the known baseline `registerSW.js` 404 error while validating death overlay flows in Playwright; it remains non-blocking and unrelated to Task 17 logic.

## 2026-02-21 Task 17 Retry (player death drop gap)

- In respawn-at-origin flows, if death occurs very close to respawn position, the player can quickly re-collect their own drop after revival due to shared pickup rules; this is expected under current acceptance scope and does not block death-drop emission correctness.

## 2026-02-21 Task 18

- `pnpm build` still reports the known baseline Vite warning about `<script src="/registerSW.js">` lacking `type="module"`; it is pre-existing and non-blocking for event-bus functionality.

## 2026-02-21 Task 18 Manual QA

- Playwright screenshot capture remains unstable in this WebGL runtime (`page.screenshot` timeout/target crash in longer sessions); deterministic QA evidence is more stable through runtime assertions + console scan + textual logs.

## 2026-02-22 Task 19

- Local Vite run still emits the known baseline `registerSW.js` console 404 warning during Playwright capture; it is unrelated to thinking-bubble functionality and non-blocking for acceptance.
