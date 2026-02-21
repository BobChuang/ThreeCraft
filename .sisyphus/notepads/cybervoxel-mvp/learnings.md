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

## 2026-02-21 Task 6

- Extending `Player` directly for `NPCEntity` lets NPCs reuse the existing limb swing timing (`animateStamp / 75`) while swapping animation poses by state.
- Spawning NPCs must happen after `terrain.updateState()` in single-player flow, otherwise terrain clear/rebuild will wipe scene-attached NPC meshes.
- Nameplate rendering works reliably with `THREE.Sprite` + `CanvasTexture` attached to each player model, and can be distance-culled together with the NPC mesh for cheap visibility control.

## 2026-02-21 Task 6 Gate Fix

- The renderer-side NPC roster must be keyed by simulation IDs (`npc-01..npc-10`) and refreshed from `SimulationEngine.getNPCStates()` every frame to avoid drift from hardcoded local spawn lists.
- Preserving interpolation is straightforward by continuing to feed snapshot positions through `NPCEntity`/`Player` target position updates instead of direct mesh teleport each render.
- Mapping simulation `lastAction` to renderer animation states in one converter (`toNPCRenderSnapshot`) keeps controller integration thin and avoids coupling renderer to simulation internals.

## 2026-02-21 Task 7

- A dedicated `src/simulation/inventory/` module works best when split by responsibility: slot creation, add/stack rules, drop/death-drop mechanics, item catalog, and manager orchestration.
- Keeping inventory slots as fixed 20 objects (`{type, quantity, maxStack}`) simplifies full-inventory checks and keeps add/reject behavior deterministic for QA.
- Exposing inventory operations through `SimulationEngine` (`addInventoryItem`, `dropInventorySlot`, `dropAllInventoryOnDeath`, `getWorldDrops`) provides minimal integration without coupling simulation logic to UI bag rendering.

## 2026-02-21 Task 9

- The GLM service is easier to keep environment-agnostic by splitting concerns into focused modules (`minute-limiter`, `circuit-breaker`, `json-extract`, `sse-parser`) and only handling API key source differences in a small resolver.
- Emitting lifecycle events from the LLM service and forwarding them through `ClientSimulationBridge` preserves the `SimulationBridge.callLLM` contract while exposing `thinking-start/stream/complete/error` to higher layers.
- Deterministic Node-based QA can validate streaming parsing, global limiter behavior, and circuit-breaker cooldown without network flakiness by compiling `src/simulation/llm/*.ts` to a temp CommonJS folder and running mock fetch scripts.

## 2026-02-21 Task 10

- Moving decision orchestration into `src/simulation/npc-ai/` keeps `SimulationEngine` focused on scheduling and event forwarding while the AI loop handles observe/prompt/call/validate/execute details.
- A per-NPC gate (`inFlightByNpc` + `nextDecisionAt`) cleanly enforces both "skip while request in-flight" and configurable decision cadence defaults (5s) without blocking simulation ticks.
- Keeping a capped per-NPC conversation buffer (`role/content/timestamp`, max 10) is enough for short-term context and can be validated deterministically through compiled Node QA scripts.

## 2026-02-21 Task 8

- A dedicated `SimulationSurvivalManager` with per-entity elapsed-time accumulators keeps hunger/HP progression deterministic even when tick intervals vary.
- Wiring survival to both `player-local` and NPC ids in `SimulationEngine.tick()` ensures one shared ruleset (decay, starvation, regen) without NPC-only branching.
- Reusing inventory catalog food metadata plus `SimulationInventoryManager.consumeItem()` provides strict food consumption semantics: item removal first, then hunger restore and `survival:update` emission.

## 2026-02-21 Task 11

- Splitting NPC action execution into focused behavior modules (`execute-move`, `execute-gather`, `execute-build`) keeps the decision loop clean while allowing per-action delays and side effects.
- Emitting intermediate `npc:action` state updates from behavior executors provides visible animation transitions (walking/mining/building) before final decision completion events.
- Deterministic Node evidence for gather/build is reliable when the bridge world state is backed by an in-memory block map that both `getWorldState` and `modifyBlock` share.

## 2026-02-21 Task 13

- Keeping action validation in a dedicated `npc-ai/validation/` module set allows the decision loop to stay orchestration-focused while schema validation, injection checks, and feasibility checks evolve independently.
- A deterministic one-action-per-tick guard can be enforced cheaply by comparing `npc.tickCount` against an internal `actionTickByNpc` map before executing any behavior.
- Corrective-context retries work best when injected as a one-shot prompt section (`[Corrective Context]`) and consumed on the next decision call.

## 2026-02-21 Task 14

- Possession works reliably in single-player when the controller owns a local `active` snapshot: cache player camera/state on possess, pause one NPC decision loop, and restore on release.
- Keeping AI pause as an engine-level NPC-id gate (`setNPCDecisionPaused`) preserves survival tick updates while preventing new decision/history growth during possession windows.
- Mapping possessed NPC inventory directly into `ui.bag.items` plus periodic HUD notify (`HP/Hunger + item summary`) gives lightweight state visibility without introducing a new HUD component.

## 2026-02-21 Task 11 Follow-up

- For behavior executors, path reachability must be checked before side effects; otherwise gather/build can mutate blocks from unreachable positions.
- Emitting walking updates from shared path traversal and then switching to gather/build phases keeps animation transitions deterministic for renderer state mapping.

## 2026-02-21 Task 15

- Observer mode is safest as a dedicated controller that owns camera snapshot/restore and input hooks, while the main render loop only calls `observerController.update()`.
- Marker picking should write `npcId` into `mesh.userData` to avoid repeated map scans during raycast hit resolution.
- Terrain interaction gates must be applied in both block action and highlight paths; disabling only one path still leaks observer-side editing affordances.

## 2026-02-21 Task 16

- Monster rendering can piggyback on the existing NPC snapshot flow by letting `SimulationEngine.getNPCStates()` include synthetic monster snapshots and inferring monster entity type from `monster-*` ids in `toNPCRenderSnapshot`.
- A deterministic monster manager with internal seeded RNG and tick-based movement/aggro windows keeps spawn/chase/attack behavior reproducible for evidence generation without LLM coupling.
- Combat integration stays minimal by wiring monster attack callbacks to survival damage application and emitting `monster:attack`/`monster:state` events through the existing simulation event bridge.

## 2026-02-21 Task 12

- Routing the PC `E` key through action control first (try nearby NPC dialogue, then bag fallback) avoids input conflicts and keeps dialogue interaction scoped to single-player runtime.
- `NPCConversationHistory` pair logs plus `SimulationEngine.getNPCPairDialogueHistory()` provide a deterministic way to verify NPC→NPC delivery separately from renderer/UI behavior.
- Playwright evidence is most reliable when triggering a real player message then immediately re-showing the confirmed NPC reply text on the same NPC for screenshot timing within the 5-second bubble window.

## 2026-02-21 Task 17

- Death/respawn flow is safest when modeled as explicit runtime state (`SimulationDeathManager`) instead of inferring from survival HP every frame; this prevents repeated death side effects and keeps respawn timers deterministic.
- Reusing `SimulationInventoryManager.dropAllForDeath()` plus a centralized drop sweep (`purgeExpiredDrops`) keeps death-drop lifecycle minimal and avoids a second world-item model.
- UI verification is stable when Playwright drives `simulation.survival.setState(...hp=0)` directly and asserts the overlay + respawn button behavior from browser runtime state.

## 2026-02-21 Task 17 Retry (player death drop gap)

- The minimal safe fix is a single call to `dropAllInventoryOnDeath('player-local', position)` inside `handlePlayerDeath()` before emitting `player:death`, reusing the exact same drop pipeline already used by NPC death.
