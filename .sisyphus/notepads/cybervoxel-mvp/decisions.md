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
