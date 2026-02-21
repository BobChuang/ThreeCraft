# Decisions

## 2026-02-21 Task 1

- Added `VITE_FIXED_MAP_INDEX` to development/production env files with empty default to preserve random selection unless explicitly set.
- Implemented deterministic override only in single-player startup pre-check path (`startGame`) without touching random algorithm internals.
- Invalid fixed index handling uses a single startup warning gate and falls back to the existing random selection path.

## 2026-02-21 Task 2

- Introduced a dedicated NPC typing module at `src/utils/types/npc.ts` with `NPC_RUNTIME_TYPES`, `NPC_ACTIONS`, and `isValidNPCAction()` for runtime action validation.
- Kept block/weather backward compatibility by appending new cyberpunk entries only (no edits to existing block IDs, textures, or weather rows).
- Reused existing block 3D preview assets for newly registered cyberpunk blocks while supplying new standalone cyberpunk texture PNG assets for visual identity and loader registration requirements.

## 2026-02-21 Task 3

- Implemented exactly 10 standalone persona definition files matching the required roster and professions, then exposed them through `src/simulation/personas/index.ts` as the single import surface.
- Standardized each persona object to the required schema (`name`, `profession`, `backstory`, `systemPrompt`, `traits`, `defaultGoals`, `preferredActions`) without introducing additional runtime dependencies or simulation logic.
- Kept scope strictly additive to Task 3 by changing only persona files plus required QA evidence and notepad append entries.

## 2026-02-21 Task 5

- Implemented pathfinding as pure TypeScript modules under `src/simulation/pathfinding/` with `index.ts` limited to exports to preserve modular architecture rules.
- Chose deterministic 4-direction grid movement with vertical candidates (`y`, `y+1`, `y-1`) so one-block upward stepping is supported while keeping search branching bounded.
- Added `PathStuckDetector` with a hard threshold of 3 unchanged ticks and exposed `shouldRerouteFromStuckTicks()` so later AI loops can trigger reroute logic consistently.

## 2026-02-21 Task 4

- Added a dedicated contract module at `src/simulation/contracts/simulation-bridge.ts` as the only required I/O boundary (`getWorldState`, `callLLM`, `emitEvent`, `modifyBlock`) for environment-agnostic simulation.
- Implemented `SimulationEngine` with default `tickIntervalMs = 500` and `observerSleepDistance = 128`, plus deterministic 10-NPC registry initialization and typed event emission hooks for UI integration.
- Integrated single-player startup in `src/controller/index.ts` with `ClientSimulationBridge` and stub-brain mode enabled by default, while gating activation behind `!multiPlay.working` to keep multiplayer behavior unchanged.

## 2026-02-21 Task 6

- Added a dedicated `src/core/npc/` module set (`entity`, `renderer`, `personas`, `nameplate`, `types`) and kept `index.ts` as export-only to satisfy modular architecture constraints.
- Mapped all 10 persona/profession NPC profiles onto existing `skinsMap` indices only (no new assets), with deterministic spawn offsets around `(0, surface_y, 0)`.
- Integrated `NPCRenderer` only into single-player runtime (`Controller.runGame` / `tryRender` / `endGame`) and left multiplayer protocols/controllers untouched.

## 2026-02-21 Task 6 Gate Fix

- Replaced hardcoded NPC spawn orchestration with `NPCRenderer.syncSnapshots()` so simulation state is the single source of truth for rendered NPC lifecycle.
- Standardized persona mapping to simulation IDs (`npc-01..npc-10`) and resolved skin assignment via ID lookup (`getNPCSkinById`) to keep renderer/persona alignment deterministic.
- Updated single-player render loop to convert `SimulationNPCState` into `NPCRenderSnapshot` each frame and removed terrain-dependent NPC bootstrap logic from controller.

## 2026-02-21 Task 13

- Added a modular validation pipeline at `src/simulation/npc-ai/validation/` that composes JSON/schema checks (`isValidNPCAction` reuse), prompt-injection filtering, and feasibility checks before any action execution.
- Chose explicit fail-safe fallback behavior in `NPCDecisionLoop`: invalid/suspicious/unfeasible actions emit warning lifecycle events, force an `idle` action, and enqueue a corrective prompt hint for the next decision tick.
- Enforced deterministic one-action-per-tick using a per-NPC `actionTickByNpc` map keyed by current `npc.tickCount`.

## 2026-02-21 Task 14

- Added a dedicated possession module at `src/controller/possession/` and kept its `index.ts` export-only so controller integration remains modular.
- Implemented possession as instant camera/state switching with local cache restore (no transition animation), matching MVP scope and existing first-person control path.
- Chose explicit single-player conflict handling: repeated direct possession requests while already possessing return `false` and emit a user-facing hint, while `Tab` continues to act as a possess/release toggle.

## 2026-02-21 Task 11 Follow-up

- Enforced strict path-first semantics in `execute-move`, `execute-gather`, and `execute-build`: actions now return `applied: false` with `reason: path-not-found` when target routing is unreachable.
- Kept behavior wiring bridge-driven and minimal by reusing existing `findPathToTarget` + `SimulationBridge.modifyBlock` + inventory callbacks instead of adding engine-side shortcuts.

## 2026-02-21 Task 15

- Added `src/controller/observer/observer-controller.ts` as the single owner for god-mode toggle (`G`), OrbitControls lifecycle, marker sync/picking, and observer HUD updates.
- Chose minimal integration points only: controller bootstrap/update/reset hooks plus observer guards in block action/highlight to enforce non-editable observer mode.
- Reused existing possession path by delegating marker double-click directly to `possessionController.possessNPC(npcId)` and surfaced possession state in observer mode indicator text.
