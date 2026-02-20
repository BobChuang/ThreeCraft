# Issues

## 2026-02-21 Task 1

- `pnpm exec tsc --noEmit` currently fails with a large set of pre-existing repository-wide TypeScript errors unrelated to this task (strict null checks/implicit any/etc. across many files).
- This task-level change is verified via Playwright scenarios and targeted runtime checks, but global typecheck remains blocked by baseline project state.
