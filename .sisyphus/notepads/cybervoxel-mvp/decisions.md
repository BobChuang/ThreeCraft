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

## 2026-02-21 Task 16

- Implemented monster runtime in a dedicated `src/simulation/monsters/` module (`catalog`, `types`, `manager`, `index`) and kept AI deterministic (idle/wander, aggro at 12, melee at 2 with 2s cooldown, disengage at 20+).
- Chose to integrate monster rendering through `src/core/npc/renderer.ts` using a new `MonsterEntity` class and typed snapshot flags (`entityType`, `monsterType`) instead of creating a separate renderer pipeline.
- Kept death-drop logic scoped to Task 16 by adding a lightweight world-drop helper in inventory manager and triggering 50% Synth-Ration drop from `SimulationMonsterManager.damageMonster()`.

## 2026-02-21 Task 12

- Kept dialogue UI as a dedicated module (`src/ui/dialogue/`) and integrated it through existing UI/controller wiring instead of embedding logic in bag/action plugins.
- Extended `npc:dialogue` event payload with `sourceNpcId`/`sourceType` so the same bridge event can represent player→NPC and NPC→NPC flows without adding new event types.
- Chose capped (10) per-pair dialogue history keyed by normalized NPC id pair to support deterministic evidence retrieval and bounded memory usage.

## 2026-02-21 Task 17

- Added dedicated death module files under `src/simulation/death/` (`death-manager`, `death-constants`, `types`) and kept `index.ts` export-only to preserve modular boundaries.
- Chose event-driven player death UX (`player:death` / `player:respawn`) and kept respawn point ownership split: `x/z` from simulation constant, `surface_y` resolved in controller via terrain floor height.
- Implemented NPC death as deterministic sequence: drop all inventory, append death system note into NPC history, schedule 10s respawn at Revival Spring `(0,1,0)`, restore survival, clear inventory, and resume AI ticks.

## 2026-02-21 Task 17 Retry (player death drop gap)

- Standardized player death to share the same drop path as NPC death by invoking `dropAllInventoryOnDeath('player-local', position)` in `handlePlayerDeath()`, avoiding any parallel drop logic.

## 2026-02-21 Task 18

- Introduced a client-only typed NPC event bus (`ClientNPCEventBus`) and kept `SimulationEngine` unchanged by mapping bridge events (`npc:action`, `npc:dialogue`, `survival:update`) into the new UI contract via mapper modules.
- Emitted `NPC_STATE_UPDATE` as batched events from the single-player render loop (`mapNPCStatesToClientEvents`) so UI consumers can track full NPC state snapshots without accessing simulation internals directly.
- Centralized bus consumption in controller-level subscriptions, then exposed read-only NPC state getters for observer sidebar / possession HUD to keep integration thin and single-player scoped.

## 2026-02-22 Task 19

- Adopted `CSS2DRenderer` as a global HUD overlay in `Core` and attached per-NPC `CSS2DObject` thinking bubbles under `src/core/npc/thinking-bubble/` to align with label overlay architecture.
- Finalized end-to-end thinking lifecycle wiring in controller/event pipeline: `thinking:state` drives requesting/received/executing/idle state changes, `thinking-stream` drives live chunk updates, and `npc:action` enforces final executing text.
- Kept scope isolated to Task 19 by excluding unrelated dirty files from commit (`.sisyphus/ralph-loop.local.md`, task-18 manual QA leftover) while appending only required notepad records.

## 2026-02-22 Task 20

- 新增 `src/ui/sidebar-log/` 独立模块（`index/types/event-reader/status-meta/entry-template/css`）承载日志面板能力，保持 `src/ui/index.ts` 仅做最小装配接入。
- 决策状态颜色按验收要求固定映射：请求中=黄、成功=绿、执行中=蓝、错误=红，并在条目中统一展示时间戳、tokens、延迟与可展开原始响应/推理信息。
- 控制器仅在既有 `handleSimulationEvent` 中转发事件到 `ui.sidebarLog`，不改 server/socket 与 simulation 协议边界，确保 Task 20 作用域最小化。

## 2026-02-22 Task 21

- 新建 `src/ui/task-list/` 独立模块（`index/render-task-items/types/css`），并只在 `src/ui/index.ts` 做装配接入，保持 UI 模块化边界。
- 控制器端新增 `npcTaskTrackerById` 作为客户端只读任务视图状态，数据来源严格限定为 `NPC_ACTION` 事件里的 `nextGoal`，不引入玩家任务分配能力。
- 任务面板刷新策略采用“每帧计算可见模型 + 签名去重渲染”：满足附身态自动刷新与释放即隐藏，同时避免不必要 DOM 重绘。

## 2026-02-22 Task 22

- 采用新增 UI 模块 `src/ui/survival-hud/`（`index.ts` + `types.ts` + `css/style.less`）承载 HUD 渲染，`src/ui/index.ts` 仅做最小注册，保持现有 UI 装配模式。
- 控制器端新增 `getSurvivalHUDState()` 统一聚合显隐门控（仅 PC + 赛博朋克）与运行态数据（生存值、模式文案、NPC 活跃数），避免 HUD 组件直接读取 simulation/controller 子系统。
- 玩家生存值来源选择 `survival:update` 事件缓存（`player-local`），附身态优先读取当前 NPC survival，实现「普通/观察者/附身」与 HP/饥饿条动态一致更新。
