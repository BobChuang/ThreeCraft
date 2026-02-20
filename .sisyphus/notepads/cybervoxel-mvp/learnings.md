# Learnings

## 2026-02-21 Task 1

- Single-player map selection is bound to `config.weather` in `Controller.startGame` and uses `Math.floor(Math.random() * weatherConfig.length)` as the random index source.
- A safe deterministic debug override can stay fully pre-check based: parse env once, validate integer/range, then only replace the chosen index value.
- Playwright QA can validate runtime config behavior by importing browser modules in `page.evaluate` and calling `controller.startGame(true)` directly.

## 2026-02-21 Task 2

- Added cyberpunk map resources by appending eight standalone `cyber*.png` textures under `src/assets/textures/blocks-clipped/` and wiring them into `src/core/loader/index.ts` imports, texture loading, nearest-filter setup, `blockTypes`, and `blockLoader`.
- Weather generation expects tuple order `[water, surface, base, nameIndex]`; new cyberpunk tuples were appended with `nameIndex = 5` without modifying existing entries.
- Runtime scene evidence can be captured deterministically by setting `config.weather` in browser runtime before starting single-player, then taking a Playwright screenshot.

## 2026-02-21 Task 3

- Persona modules under `src/simulation/personas/` can stay simple data exports, with a barrel `index.ts` providing both named exports and a unified `npcPersonas` roster for downstream simulation wiring.
- Embedding GLM-oriented constraints directly in each `systemPrompt` (JSON-only actions, grounded world-state reasoning, no impossible actions) keeps persona behavior guidance reusable for later AI loop integration.
- Lightweight Node-based QA scripts are effective for artifact generation: they validated file count, required fields, prompt length >=200 chars, name/profession mention, and cross-persona prompt uniqueness in one pass.

## 2026-02-21 Task 5

- Pathfinding for this project should treat walkability as a standing air cell with a solid block directly below; this keeps checks deterministic with voxel world queries.
- A strict exploration cap of 200 nodes can make long-range routes intentionally return null, so NPC movement should request shorter waypoint hops when targets are far away.
- A module-level LRU route cache keyed by normalized start/target points gives predictable cache hits for repeated movement intents without introducing environment coupling.

## 2026-02-21 Task 4

- Keeping the simulation core behind `ISimulationBridge` makes `SimulationEngine` runnable in pure Node checks without DOM or renderer dependencies.
- Deterministic NPC bootstrap is easiest by deriving ids and spawn offsets from the first 10 persona entries, giving stable ordering for evidence scripts.
- A lightweight mocked client bridge plus short tick interval produces reliable QA evidence for event emission, block modification delegation, and sleep/wake-ready observer updates.
