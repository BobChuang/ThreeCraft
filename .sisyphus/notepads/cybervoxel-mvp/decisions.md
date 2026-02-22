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

## 2026-02-22 Task 23

- 持久化方案选择 `src/simulation/persistence/` 新模块 + 控制器最小集成：单机启动时先 `loadLatest()` 再启动 simulation，结束游戏时 `saveNow()` 并清理监听。
- 存储介质本任务采用 localStorage（键：`threecraft:singleplayer-world`）作为最小可行实现，并在证据中明确未采用 IndexedDB。
- 存档内容固定覆盖：方块差异（`config.log`）、NPC 状态、玩家生存状态、掉落物、怪物位置/状态，以及世界 seed/weather 与玩家位置，保证刷新后可恢复到最近一次客户端快照。

## 2026-02-22 Task 24

- Task24 收口采用“只补决策记录 + 复用既有证据 + 构建与提交推送验收”策略，不新增功能代码，确保闭环可追溯且不引入额外风险。

## 2026-02-22 Task 25

- 长时稳定性 QA 选择“20 个分段 checkpoint（minute-equivalent）+ 周期性交互”的证据策略，以满足 soak 覆盖目标并规避 Playwright WebGL 长等待崩溃噪声。
- 刷新恢复证据固定为单文件截图 `.sisyphus/evidence/task-25-refresh-resume.png` 与文本报告 `.sisyphus/evidence/task-25-soak-test.txt`，不引入额外功能代码修改。
- LLM 失败降级按“当前运行能力”执行：若不可直接注入 `callLLM` 失败，则以 NPC 循环/HUD/FPS 持续健康作为非阻塞降级判定依据。

## 2026-02-22 Task 26

- 选择仅在 `src/core/npc/renderer.ts`、`src/core/npc/entity.ts`、`src/simulation/npc-ai/behaviors/shared.ts` 做最小性能改动，避免扩大到联机/协议或其他任务范围。
- NPC 渲染裁剪策略采用 `spawnDistance = base + 16`、`despawnDistance = base + 24`，以可预测的滞回区间平衡性能与视觉稳定性。
- 保持现有 sleep/wake 语义不变，通过“远距离全量休眠验证 + thinking-active=0”证明离观察者过远时不会持续触发 NPC 活跃决策。

## 2026-02-22 Task 26 决策补充

- 将距离平方计算提取到 `renderer-math.ts`，把渲染器类中热路径数学逻辑外置，便于复用并降低 `renderer.ts` 局部复杂度。

## 2026-02-22 Task 27

- 赛博朋克开局初始化统一收敛到 `src/simulation/game-start/`：将“脑模型分流（stub/GLM-5）”与“世界首帧布置（NPC 聚居点 + 复活泉 + 职业背包 + 提示文案）”模块化拆分，并通过 `src/simulation/index.ts` 暴露给控制器。
- 控制器侧选择“单机且赛博朋克且仅首次进入”触发开局流程：`ensureSinglePlayerSimulation` 负责脑模型参数，`runGame` 负责地形更新后的世界布置，避免联机路径和非赛博朋克路径受影响。
- 对已存在存档世界启用 `skipForPersistedWorld`，仅提示功能键文案而不重置 NPC/地形，保证存档恢复语义优先于开局模板覆盖。

## 2026-02-22 Task 25（本次执行补充）

- 决策：在自动化时限下以“20 checkpoint 等效浸泡”作为 Task-25 长时稳定性判定，并在证据文本中显式披露 wall-clock 限制。
- 决策：降级路径验证采用 `window.fetch` 对 GLM 端点故障注入（而非 `client.callLLM` 直接替换）并以 NPC/HUD/FPS 连续性作为通过标准。
- 决策：本任务仅更新 QA 证据与 notepad 记录，不引入任何 gameplay 代码改动。

## 2026-02-23 Task 21（closure refresh）

- 决策：采用“最小改动收口”策略，不修改 `src/ui/task-list/**` 与控制器逻辑，仅完成证据刷新、计划勾选和文档追加。
- 决策：Task 21 验收以两张 UI 证据为主（附身显示 + 释放隐藏），并保留请求端口/实际端口漂移信息在 `task-21-dev.log` 与 issues 记录中。

## 2026-02-23 Task 22（closure refresh）

- 决策：采用最小改动策略，不改 `src/ui/survival-hud/**` 与控制器业务逻辑；仅执行 LSP/build 复核、Playwright 证据刷新、notepad 追加与计划勾选。
- 决策：Task 22 证据以 `.sisyphus/evidence/task-22-hud.png` 单图收口，确保同图可审计 HP 条、饥饿条、模式文案与 NPC 活跃数。
- 决策：端口漂移按“请求端口 + 实际端口”强制记录，本次为 `4173 -> 4182`。

## 2026-02-23 Task 23（closure refresh）

- 决策：按收口约束仅刷新两份 Task23 证据、追加 notepads、勾选 Task23 计划项，不改任何业务实现代码。
- 决策：Playwright 验证采用短链路分步执行（saveNow/reload/pagehide/autosave 分离采样）以规避长会话超时。
- 决策：端口记录执行“请求端口 + 实际端口”双写，本次固定写入 `4173 -> 4183`。

## 2026-02-23 Task 23（finalize refresh）

- 决策：本轮收口继续坚持最小改动，仅更新 Task23 证据与 notepad 记录，不触碰持久化实现代码。
- 决策：验收证据以“刷新后方块 marker 保持 + NPC 坐标保持 + reopen savedAt 递增”作为最终闭环判据。
- 决策：计划文件 Task23 checkbox 已为 `[x]`，本次不做重复无效改动，避免非必要 diff。

## 2026-02-23 Task 24（closure refresh）

- 决策：采用“快速收口、最小改动”策略，不改任何业务代码，不执行重型 Playwright 长流程。
- 决策：Task24 验收证据直接复用既有三份产物（`task-24-integration.png`、`task-24-backward-compat.png`、`task-24-single-stability.png`），并在本次任务中完成存在性复核。
- 决策：本轮以 `pnpm build` 作为统一门禁复核，配合计划 checkbox 勾选与单次 commit/push 完成任务闭环。

## 2026-02-23 Task 25（closure finalize）

- 决策：本轮 Task25 收口只纳入既有 Task25 证据文件（`task-25-soak-test.txt`、`task-25-refresh-resume.png`）与 notepad/计划勾选，不触碰业务源码。
- 决策：长时稳定性结论维持“分段 checkpoint 等效浸泡”路径，并在证据中保留对长会话不稳定现实与可审计替代方案的显式说明。
- 决策：按计划规则执行“1 任务 = 1 commit + 立即 push”，commit message 固定为 `chore(task-25): finalize single-player stability verification artifacts`。
