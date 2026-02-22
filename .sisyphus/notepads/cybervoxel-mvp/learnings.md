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

## 2026-02-21 Task 18

- Adding a dedicated typed bus under `src/simulation/events/` allows UI-facing contracts (`NPC_STATE_UPDATE`, `NPC_ACTION`, `NPC_DIALOGUE`, `SURVIVAL_UPDATE`) to stay stable while SimulationEngine keeps emitting existing bridge events.
- Jitter reduction is effective when throttling per event type + entity key (e.g., `npcId`/`entityId`) and keeping only the latest pending event for that key before flush.
- Migrating observer sidebar and possession HUD to `Controller` bus-backed state access (`getNPCStateFromClientBus*`) decouples UI reads from direct simulation polling while preserving single-player-only wiring.

## 2026-02-21 Task 18 Manual QA

- In Playwright runtime QA, dynamic import of `'/src/index.ts'` is a reliable way to access the live singleton `Controller` and run deterministic single-player verification checks without source changes.
- Single-player validation can prove bus integration health by combining `simulationEngine.getNPCStates()` presence checks with a bus getter read (`getNPCStateFromClientBus`) and a user-visible possession indicator assertion (`附身：<name>`).

## 2026-02-22 Task 19

- CSS2D thinking bubble auto-hide must use the same time base end-to-end (`Date.now` for show/update checks); mixing `Date.now` and `performance.now` prevents expiry from triggering.
- Thinking stream rendering is more stable when controller caches per-NPC accumulated chunks and reuses that cache in the `received` phase, instead of replacing with placeholder text.
- Simulation lifecycle mapping needs to accept both `eventType` (bridge LLM events) and `status` (engine lifecycle forwarding) to keep thinking-stream events reachable across both paths.

## 2026-02-22 Task 20

- 侧边栏日志面板可通过复用 `thinking:state` 与 `simulation:lifecycle` 现有事件流实现，无需新增桥接协议；并需同时兼容 `eventType` / `status` 两种字段来源。
- 以 `activeRequestIdByNpc + rawByNpc` 维护单 NPC 请求生命周期，能够把 `thinking-stream` 分段内容聚合到 `thinking-complete/error` 的同一条目，便于详情展开查看。
- Playwright 在该 WebGL 场景下需要启用 SwiftShader 参数（`--use-angle=swiftshader --use-gl=swiftshader`）才能稳定渲染 HUD 并完成筛选截图证据采集。

## 2026-02-22 Task 21

- 任务列表 UI 以控制器侧 `nextGoal` 事件增量跟踪最稳定：将每次新 `nextGoal` 解析为 `current + upcoming`，并把被替换的旧 `current` 归档为 `done`，即可得到只读且有序的 `待办/进行中/完成` 列表。
- 面板显隐无需新增事件，直接在渲染循环中基于 `possessionController.getPossessedNPCId()` 决定 `taskList.sync(viewModel|null)`，可确保附身即时显示、释放即时隐藏。
- `nextGoal` 实际文本格式不固定（多行、编号、分隔符），需要做轻量标准化与多策略拆分，避免 UI 只显示原始整段字符串。

## 2026-02-22 Task 22

- 生存 HUD 适合继续沿用现有 HUD-stage 叠层模式：单独 `src/ui/survival-hud/` 模块 + `UI.loadController` 装配 + `tryRender` 每帧 `sync(viewModel|null)`，实现显隐和状态更新解耦。
- 玩家 HP/饥饿值来源可以稳定挂在 `Controller.handleSimulationEvent('survival:update')`，通过缓存 `player-local` 生存状态避免 UI 直接耦合 simulation internals。
- 模式文案和活跃 NPC 计数统一在控制器组装（普通 / 观察者模式 / 附身：{NPC}），HUD 组件只负责渲染，这样后续模式扩展不会污染 UI 逻辑。

## 2026-02-22 Task 23

- `WorldPersistenceController` 以适配器模式接入控制器最稳妥：控制器负责读取/应用 config + log + simulation state，持久化模块只负责序列化、定时保存、beforeunload/pagehide 触发。
- NPC/掉落物/怪物状态恢复在 `SimulationEngine.applyPersistedState()` 内集中处理，能避免把状态回填逻辑分散到 UI 或 bridge 层。
- 为了让“方块差异”覆盖 NPC 行为建造/采集路径，`ClientSimulationBridge.modifyBlock()` 同步写入 `controller.log.insert(blockLog)` 是必要补点，否则自动存档仅包含玩家手动编辑记录。

## 2026-02-22 Task 24 Orchestrator QA

- 在 `VITE_FIXED_MAP_INDEX=12` 下，单机进入后可稳定看到 `AI 决策日志`、10 个 NPC 名单（含 `Neon` 等）和 `10 个 NPC 活跃`，可作为赛博朋克集成流活性证据。
- 本项目的“向后兼容基础流”可通过主菜单可交互项（`单人游戏` / `上载存档` / `缓存读档`）及从游戏内 `退出` 返回菜单来做无侵入验证。
- Task 24 三张证据图统一为 1440x900；结合实时交互验证可快速确认证据文件与场景语义一致。

## 2026-02-22 Task 25

- 在当前 Playwright/WebGL 运行能力下，长时稳定性验证更可靠的方式是“分段 checkpoint + 周期性交互覆盖”（移动/战斗/建造/附身）而非单次超长等待，能显著降低自动化崩溃噪声对结论的干扰。
- `VITE_FIXED_MAP_INDEX=12` 依然是单机赛博朋克场景验证的稳定入口，配合 `single-player` 进入后可持续观测 `HUD/FPS/NPC 活跃` 健康信号。
- 刷新恢复验证采用“刷新前状态采样 -> reload -> 再次进入单机 -> 刷新后状态采样”可稳定得到可比对证据（模式/HUD/NPC 活跃数）。

## 2026-02-22 Task 26

- 在 `NPCRenderer.syncSnapshots` 中按观察者距离做“生成阈值/销毁阈值”双门限裁剪（hysteresis）可避免远距离 NPC 频繁创建销毁抖动，同时显著减少场景内实体数量。
- 渲染热路径把 `distanceTo()`（含开方）改为平方距离比较并复用 `THREE.Vector3` 观察者实例，可降低每帧分配与数学开销。
- `applyPathAsWalking` 改为 for 循环增量遍历（避免 `slice`+`forEach`）后，路径执行阶段对象分配更少，行为执行链路更轻。

## 2026-02-22 Task 26 补充

- `sleep(ms)` 增加非法值与非正数快速返回后，可避免无效定时器进入事件循环，减少行为执行链路中的空等待开销。

## 2026-02-22 Task 27

- 赛博朋克开局收口可复用单机启动钩子：在 `runGame` 的 `terrain.updateState()` 后执行一次 `initializeCyberpunkGameStart`，可稳定覆盖 NPC 初始聚居点、职业背包和复活泉落块。
- `resolveCyberpunkBrainBootstrap` 通过本地 `zhipu_api_key/ZHIPU_API_KEY/glm_api_key` 自动分流 stub 与 `glm-5`，无需改动 server/socket 路径。
- Playwright 证据采集在 WebGL 场景下应避免动态重复导入 `'/src/index.ts'`（会触发重复控制器实例）；短路径“直接进单机并立即截图”更稳。

## 2026-02-23 Task 27（本次验收收口）

- T27 启动流在当前分支已就绪，最小改动策略可以仅做“证据刷新 + 构建复核 + 计划勾选”，无需再次触碰启动逻辑源码。
- 运行证据日志必须明确记录“请求端口与实际端口”；本次 `4173` 连续占用后漂移到 `4177`，仍可稳定完成 Playwright QA。
- 对“10 个 NPC 启动可见”可用 AI 日志面板的 NPC 过滤下拉项（10 个唯一名字）做快速可审计佐证，避免依赖不稳定的运行时全局对象读取。

## 2026-02-23 F1（计划合规审计）

- F1 审计可高效分三段执行：先用代码锚点核“必须具备”，再用禁止关键词扫描核“禁止项”，最后用 `task-{1..27}` 文件存在性核任务证据完整度。
- 向后兼容冒烟建议固定记录“请求端口 + 实际端口”；本次 `4173` 自动漂移到 `4178`，仍可稳定完成 Classic 单人流验证。
- Playwright 控制台检查中仅出现已知基线 `registerSW.js` 404，可作为非阻塞噪声单独记录，避免误判为回归失败。

## 2026-02-23 F2（代码质量审查）

- 对“F2 是否通过”的判定应拆分为两层：新增问题检查（反模式/LOC/LSP）与全仓门禁检查（`pnpm exec tsc --noEmit`）；前者通过并不自动代表 F2 通过。
- 在当前仓库基线下，`pnpm build` 可通过且本次改动文件可达成 0 新增问题，但 `tsc --noEmit` 仍会被历史类型噪声阻断，必须如实标记为构建失败。

## 2026-02-23 Task 18（closure refresh）

- T18 在当前分支已具备完整单机事件总线链路：`ClientNPCEventBus`（订阅/退订/批量派发/按事件类型+实体 key 节流）+ `mapBridgeEventToClientNPCEvent` + `mapNPCStatesToClientEvents` + `Controller.ensureClientEventBus` 消费。
- 用最小 Node 脚本验证 `dispatchBatch(mapNPCStatesToClientEvents(...))` 可稳定产出 `NPC_STATE_UPDATE`，并能从 `lastAction` 推导 UI 动画语义（如 `move -> walking`）。
- 收口阶段优先“复核 + 证据刷新 + 计划勾选”，避免在已达标实现上重复改架构，可降低引入回归风险。

## 2026-02-23 Task 19（thinking bubble refresh）

- 头顶思考气泡执行态文案可直接升级为“图标 + 动作文本”（如 `👣 移动`、`💬 对话`），不需要额外 UI 组件或事件协议改造。
- `requesting` 动画点可在现有 `render(now)` 路径中按时间片计算（`Date.now()`），保持与自动隐藏同一时间基准，避免再次引入 `performance.now` 混用问题。
- `received` 阶段兜底使用当前 `streamText` 可提升稳健性：即使 reasoning 字段为空，也能复用流式聚合内容展示。

## 2026-02-23 Task 20（sidebar log refresh）

- 侧边栏日志在当前代码中已满足 T20 核心能力：`thinking:state` + `simulation:lifecycle` 双流消费、`eventType/status` 兼容、请求指标（token/latency）展示、筛选与最小化。
- 在 WebGL 场景下，展开详情按钮可能被 `#controller` 覆层拦截；自动化验证可通过 `page.evaluate(() => btn.click())` 稳定触发展开，避免 pointer-intercept flake。
- T20 筛选验收更稳的断言方式是直接采集 `#sidebar-log-list .npc` 并做 `unique` 校验（本次 `Wrench -> unique=["Wrench"]`），比视觉肉眼判断更可审计。

## 2026-02-23 Task 21（closure refresh）

- Task 21 在当前分支已具备完整闭环（附身显示/释放隐藏/nextGoal 状态序列只读），本次采用最小改动收口，仅刷新证据、计划勾选与记录，不再触碰业务源码。
- 通过运行时直接调用 `possessionController.possessNPC/releaseActiveNPC` 可稳定触发显隐并采集 UI 证据，适合规避指针锁与随机出生点导致的自动化不稳定。
- 任务列表面板状态可用 `#npc-task-list-panel.active` 与 `getComputedStyle(...).display` 双重校验（显示态 `active=true`，释放后 `display=none`）。

## 2026-02-23 Task 22（closure refresh）

- 当前分支 Task 22 的 HUD 逻辑已满足“仅 PC + 赛博朋克显示”门控：`getSurvivalHUDState()` 在 `config.controller.operation !== 'pc' || !isCyberpunkSceneSelected()` 时直接返回 `null`，因此非赛博朋克场景不受影响。
- HUD 数据聚合保持控制器侧单一出口（模式文案、HP/饥饿值、活跃 NPC 数），`src/ui/survival-hud/` 仅负责渲染；收口阶段无需再改业务逻辑，最小改动仅刷新证据。
- Playwright 证据采集可直接使用主菜单 `单人游戏` 进入并截全屏，截图中可审计到模式文案、HP/HUNGER 条与 NPC 活跃数文本。

## 2026-02-23 Task 23（closure refresh）

- Task23 收口可仅通过 Playwright 运行态写入 + `saveNow()` + reload/reopen 复核完成，不需要改动持久化实现代码。
- 端口漂移仍需强制记录“请求端口 + 实际端口”；本次为 `4173 -> 4183`。
- 在该仓库中验证 NPC 持久化时，优先使用 `simulationEngine.npcRegistry` 的运行态回读对比比深挖存储内部 schema 更稳定。

## 2026-02-23 Task 23（finalize refresh）

- 在收口复核里，采用“同一次 `saveNow()` 同步写入方块 marker + 读取 NPC 持久化快照”的方式，可一次性覆盖方块与 NPC 两类恢复证据。
- 若自动化长等待不稳定，Task23 结论仍可由“reload 恢复 + reopen 触发 pagehide 保存”两个短链路步骤稳定证明。
- 本次端口记录保持双写（请求 `4173` / 实际 `4183`）可直接满足计划审计对可追溯性的要求。
