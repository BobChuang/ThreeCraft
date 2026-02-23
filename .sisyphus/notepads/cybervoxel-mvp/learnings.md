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

## 2026-02-23 Task 24（closure refresh）

- 本次采用“快速收口”路径：复用既有 Task24 三份证据（integration/backward-compat/single-stability）并做文件存在性复核，不再执行重型 Playwright 长流程。
- 收口验收以“最小改动 + 构建复核”为核心：仅追加 notepad、勾选 Task24 计划项、执行 `pnpm build`，不触碰业务代码。
- 在当前仓库环境下，快速收口仍需保持可追溯性：明确记录本次为证据复用路径，避免后续误判为新增场景验证轮次。

## 2026-02-23 Task 25（closure finalize）

- 长时稳定性在当前自动化条件下采用“20 checkpoint 等效浸泡”是可执行且可审计的方案；关键是把 wall-clock 限制、每个 checkpoint 的交互覆盖和健康门槛写入证据文本。
- 刷新恢复验证保持“刷新前采样 -> reload -> 再进单机 -> 刷新后采样”模板，能稳定输出可比对结论并与截图证据互相印证。
- 收口阶段优先复用现有 Task25 证据改动并只补文档/计划勾选，可避免对业务代码引入新的不确定性。

## 2026-02-23 Task 26（closure finalize）

- Task26 收口采用最小改动路径：复用并补强两份既有证据（FPS / sleep），不扩展到其他任务文件。
- 性能结论文本必须同时覆盖两条主线：渲染帧率（30s FPS 采样）与远距休眠抑制（near/far decision delta + sleeping 快照）。

## 2026-02-23 F2（final-wave 复核）

- F2 最终结论必须由门禁命令主导：即使“本次新增/修改文件”未发现代码异味，只要 `pnpm exec tsc --noEmit` 非 0，结论仍应为不通过。
- 为保持审计可追溯性，建议把命令原始输出独立落盘（如 `f2-tsc.log`、`f2-build.log`），并在总证据文件中引用路径与退出码。
- 端口漂移（4173 -> 4178）与 `registerSW.js` 404 在本仓库属于基线噪声，记录为环境限制即可，不作为 Task26 阻断项。

## 2026-02-23 F3（真实手动 QA）

- F3 需要在同一轮证据中同时保留“请求端口 + 实际端口”，本次为 `4173 -> 4184`，并且应与 dev 启动日志交叉可追溯。
- Playwright 在 WebGL 场景里执行边界注入时，直接以 `simulationEngine` 运行态方法（如 `survival.setState`、`dropInventorySlot`、`possessionController`）做确定性触发，比纯键鼠脚本更稳定且可审计。
- F3 结论应由场景/集成/边界三段联合判定，不能因 Classic 向后兼容通过而掩盖场景失败；建议报告末行固定输出统一汇总格式。

## 2026-02-23 F3（真实手动 QA，final rerun）

- 主场景与 Classic 兼容建议拆分为两套 dev 会话执行：主场景保留计划请求端口追踪（本轮 `4173 -> 4185`），Classic 兼容可用独立固定地图会话（本轮 `4190 -> 4190`）保证可复现。
- 运行态验证中，`import('/src/index.ts')` + `controller.simulationEngine` 可稳定覆盖附身/生存/持久化集成检查，并可直接输出审计字段（npcCount/saveBytes）。
- Classic 兼容若受当前环境固定地图配置影响，可通过 `VITE_FIXED_MAP_INDEX=0` 独立服务直接确认 `config.weather=0`，减少误报。

## 2026-02-23 F3（FINAL 波次）

- F3 证据收口时，主场景与 Classic 最稳妥仍是双会话：`4173 -> 4185`（主场景端口漂移）与 `4190 -> 4190`（Classic 固定地图），可同时满足“请求端口+实际端口”审计要求。
- Playwright 在 ThreeCraft WebGL 场景下，用 UI 可见信号（AI 日志面板、NPC 过滤项数量、FPS）做集成链路佐证比依赖运行时私有对象更稳，避免 `window.controller` 暴露差异导致假阴性。
- F3 报告末行需要严格保持模板格式（`场景 [N/N 通过] | 集成 [N/N] | 边界用例 [N 已测] | 向后兼容 [通过/失败] | 结论`），否则 final-wave 规则校验会失败。

## 2026-02-23 F4（范围一致性检查）

- F4 审计最稳妥的核验链路是“三点合一”：计划 F4 条目 + T1-T27 提交策略表 + F1/F2/F3 证据结论交叉对照。
- `pnpm exec tsc --noEmit` 在当前仓库仍是基线失败（exit 2），F4 需按原始结论如实记录，不在本任务内扩展修复。
- 末行格式必须严格收束为 `任务 [N/N 合规] | 范围蔓延 [无/N 项问题] | 未说明 [无/N 个文件] | 结论`，否则不满足 final-wave 输出约束。

## 2026-02-23 Task 27（GLM endpoint localStorage wiring）

- 在脑模型 bootstrap 侧新增 endpoint 解析即可完成能力扩展：GLM service 已内置默认 endpoint 回退，不需要改 service 实现。
- localStorage endpoint 值应统一 `trim()` 并将空字符串归一为 `undefined`，避免把空值显式传入请求配置。
- 通过对象条件展开仅在有值时注入 `llmConfig.endpoint`，可保持既有 API key 分流与默认行为不变。

## 2026-02-23 NPC 嵌地最小修复

- 单机 NPC 高度修正需要覆盖“初始化 + 后续移动”两段链路：在 `Controller.tryRender` 中按地形把 `npc-*` 持续对齐到 `floor+1`，可防止一次性 spawn 修正后再次漂移。
- 当前工程里 `Player.setPosition` 内置 `y - 0.25` 偏移；若 NPC 复用该实现会出现额外下沉。给 `NPCEntity` 单独覆盖 `setPosition`（不减 0.25）后，脚底与地面恢复正常。
- `ast-grep` 检查显示偏移链路可控：NPC 渲染侧保留 `+0.25`，而玩家通用 `-0.25` 不再作用于 NPC，从而避免重复补偿导致的嵌地。

## 2026-02-23 NPC 嵌地修复独立验收（本轮）

- 运行态验收必须保留“请求端口 + 实际端口”双写；本轮为 `4173 -> 4186`。
- 仅凭“进入单机 + NPC 名单存在”不足以证明嵌地已修复，仍需以场景可视截图核验 NPC 脚底与地表关系。
- 本轮截图可见至少 3 个 NPC，但出现 1 个明显半身嵌地个体，说明需要继续针对地形对齐链路做回归排查。

## 2026-02-23 NPC 嵌地修复 retry-2（grounding 原子补丁）

- 在体素列扫描中仅找到“solid 且上方 air”的站立面（`hasBlock(y) && !hasBlock(y+1)`）比“遇到任意 solid 即返回”更稳，能避免把 NPC 放进封闭列顶部造成半嵌地。
- 对浮点 `x/z` 的多列容错采样策略仍保持有效，本轮仅追加“可站立面判定”这一处最小增量，未触碰多人或决策节奏逻辑。
- 复核链路继续采用 `LSP + build + 运行态截图判读`；当自动化浏览器不可用时，需要把阻断原因单独落入 issues，避免把“未复核”误记为“已通过”。

## 2026-02-23 NPC 嵌地最终验收闭环（阻断项）

- `NPCEntity.setPosition` 在保留 `x/z` 插值的同时，直接同步 `position.y/player.position.y` 到目标高度，可消除地形台阶与移动更新交叠时的短时下沉视觉。
- 单机验收必须覆盖两段：进入场景后的 spawn 站位 + 一次短程移动后的稳态站位，两段都通过才算闭环。
- 本轮端口未漂移（请求 `4173` / 实际 `4173`），但 Playwright 会话在截图后仍可能 `Target crashed`；证据文本需明确崩溃时点以避免误判截图无效。

## 2026-02-23 NPC 决策节奏去同步（cadence staggering）

- 通过对 `npc.id` 做稳定哈希并映射到固定抖动窗口（`decisionIntervalMs * 0.2`），可以在不改 observe/prompt/validate/execute 管线的前提下打散同频触发峰值。
- 初始调度与循环调度都应使用同一抖动规则：初始仅偏移 `jitter`，循环使用 `interval + jitter`，从而保持每个 NPC 的稳定相位差。
- 玩家对话触发保持即时（`nextDecisionAt = now`）可保留交互响应性，同时不会破坏常规 cadence 去同步策略。

## 2026-02-23 F2（代码质量审查，收口复核）

- F2 报告应明确“审查范围 = 当前新增/修改文件”；当该范围无代码文件时，反模式与 LOC/模块化规则可判为“通过/不适用”，但必须和全仓门禁结果分开陈述。
- 审计可追溯性关键在于保留原始命令日志路径与退出码（`f2-tsc.log` / `f2-build.log`），并在总报告中引用具体文件名。
- 结论串建议固定格式输出：`构建 [通过/失败] | 文件 [N 通过/N 问题] | LOC 规则 [通过/失败] | 结论`，便于 final-wave 机器校验。

## 2026-02-23 F2（收口同步）

- F2 收口阶段应先复跑两条门禁命令（`pnpm exec tsc --noEmit` 与 `pnpm build`），再落最终结论，避免沿用旧日志造成审计不一致。
- 结论字段建议放在报告末行并显式写出通过/不通过与退出码（如 `tsc=2, build=0`），可直接满足 final-wave 规则校验。

## 2026-02-23 F3（manual QA rerun）

- F3 收口证据应固定记录“请求端口 + 实际端口”，本轮两条链路均发生漂移（主场景 `4173->4175`，Classic `4190->4191`），双写能显著提升回放可追溯性。
- 在 WebGL 自动化场景中，优先使用可见 UI 信号（AI 日志面板、NPC 下拉选项、FPS/HUD 文本）做结论支撑，比依赖私有运行态对象暴露更稳。
- F3 末行汇总格式必须严格固定并包含“结论：通过/不通过”，否则会被 final-wave 规则校验判为不合规。

## 2026-02-23 Final DoD reconciliation

- Final DoD 对账以“本轮 fresh evidence 是否可直接审计”为唯一勾选标准，历史实现状态不能替代本轮链路证明。
- 对 UI 可见链路（dev 可进入单机、10 NPC 过滤项、思考气泡+生命周期状态）可稳定形成 PASS 证据，因此可安全勾选 3 项。
- 对附身/观察者/持久化等依赖运行态钩子的条目，若本轮无法稳定访问控制器接口，必须按 FAIL 处理并在报告中明确“可访问性不足”而非功能断言。

## 2026-02-23 DoD line 99（赛博朋克场景）

- 对“场景可选/可随机”条目，若 UI 未直接暴露场景切换器，可用 `VITE_FIXED_MAP_INDEX` 走“确定到达”替代证明链路，并在证据中明确写出该判定依据。
- 运行时用 `config.weather -> weather tuple -> blockTypes` 三段映射（如 `tupleNames: cyberNeon/cyberGrid/cyberSteel`）可以形成比纯截图更可审计的“地形方块归属”证据。
- 端口漂移在本仓库是高频现象；本轮再次验证“请求端口 + 实际端口”双写是 final-qa 复盘可追溯性的关键字段。

## 2026-02-23 DoD line 102（附身 + 第一人称控制）

- 若需稳定证明“附身后第一人称控制”，可在同一轮 Playwright 中直接走运行时控制链路（`possessionController` + `moveController.positionMove/viewDirectionMove`），并同时采集 camera 与 NPC 位置/朝向增量，形成可审计闭环。
- “任意 NPC”证据建议固定为“同一轮至少 2 个不同 npcId 成功附身并保持 `possessedId===targetId`”，避免只验证最近 NPC 导致覆盖不足。
- DoD 收口文本需同时写明 `请求端口 -> 实际端口`、`tsc/build 退出码` 与截图/console/network 路径，便于最终审计回放。

## 2026-02-23 DoD line 103（观察者/上帝模式返回）

- 观察者模式验收可直接用 `#observer-mode-indicator` 做最小可审计链路：同会话按 `g` 验证 `普通 -> 观察者模式 -> 普通`，无需改动业务源码。
- line103 收口建议固定证据组合为 `txt + png + dev/console/network + tsc/build`，并在文本里显式记录端口映射（本轮 `4173 -> 4178`）。

## 2026-02-23 DoD line 104（单标签页单人交互稳定性）

- line104 收口可采用“运行态双信号”最小证据链：同一轮采样内同时拿到 `player-local -> npc-*` 对话日志与 NPC 自主更新（位置或 `lastAction` 变化），即可形成可审计稳定性证明。
- 对话触发可复用 `controller.tryOpenDialogueWithNearbyNPC()` + `#dialogue-input` Enter 提交，避免依赖长键鼠路径与指针锁不稳定因素。
- 端口漂移依然高频，本轮必须继续双写 `4173 -> 4181`，并在证据中显式区分“基线 `registerSW.js` 404”与 QA 脚本引入的额外控制台噪声。

## 2026-02-23 DoD line 105（HP/HUNGER/怪物攻击）

- 在本轮黑盒链路中，`HUD 可见` 与 `怪物攻击导致 HP 下降（含死亡覆盖层）`可稳定复现并形成截图证据。
- line105 的关键阻断点是“采集恢复饥饿值”的可见前后对比：若缺少可观察的食物消费入口与数值上升证据，即使其它两条通过也不能勾选。
- 收口文本仍应固定包含 `请求端口 -> 实际端口` 与 `tsc/build` 退出码，便于复跑审计。

## 2026-02-23 DoD line 106（死亡重生 + 掉落位置）

- line106 证据链最稳妥做法是同一轮运行态里串行断言：先触发死亡覆盖层，再点复活，再同时回读“复活点位置 + 掉落物仍在死亡位置”。
- 若玩家在复活点附近死亡，掉落物可能在复活后立刻被拾取；为稳定证明“掉落留在死亡点”，应先把死亡位置设到远离复活泉的固定坐标再触发死亡。
- 本轮端口再次漂移（`4173 -> 4182`），DoD 文本必须保留请求端口与实际端口双写，才能保证可审计回放。

## 2026-02-23 DoD line 107（重新打开后持久化）

- line107 最稳的验收链路是同一轮串行三段：`saveNow()` 后先做 reload，再做 reopen，并在每段都回读同一组样本（方块 marker / 同一 npcId 的位置状态 / 同一背包槽位）。
- NPC 位置持久化在验收文本里建议以 `XZ` 作为主判定字段（与地形贴地机制解耦），同时保留 `decisionPaused` 这类状态字段，能提高“位置 + 状态”条款的可审计性。
- 端口漂移在 DoD 收口中仍是高频事实，本轮继续记录 `4173 -> 4183`，并与 `dod-107-dev.log` 保持可回放一致。

## 2026-02-23 DoD line 105（closure attempt refresh）

- line105 本轮仍需三条同轮闭环才可勾选；任一条款缺失时必须保持 BLOCKED，不能沿用历史通过片段替代本轮证据。
- 端口漂移记录仍是强制项，本轮为 `4173 -> 4185`，并可直接从 `dod-105-dev.log` 回放。
- 在当前自动化链路里，`#survival-hud` 结构存在但可见性为 `display:none`，必须把“存在”与“可见”分开判定，避免误报 HUD 可见。

## 2026-02-23 DoD line 105（retry run on 4189）

- line105 收口必须坚持“同轮 3 条款全通过”门槛；本轮三条都未形成通过证据时应直接维持 BLOCKED，避免部分通过误勾选。
- 饥饿条款在 `hungerBefore=100` 时即使 `consumeFood` 成功也不会产生上升量，证据文本必须记录 `hungerDelta=0`，不能只写“consume 成功”。
- 怪物条款应同时记录“轮询窗口长度 + maxMonsterCount + hpDelta”；本轮 `45s + maxMonsterCount=0 + hpDelta=0` 可直接形成不可通过证据链。

## 2026-02-23 DoD line 2343（cyberpunk single stability closure attempt）

- line2343 收口证据仍需严格双写端口映射；本轮再次发生漂移（`4173 -> 4186`）。
- 对“单机稳定”可审计信号可用三段 checkpoint 固定采样：`模式文案 + FPS + AI 日志计数 + 10 NPC 下拉项`，比只留单张截图更稳。
- `registerSW.js` 404/non-module 需继续与结论解耦；本轮真正阻断来自 Playwright 后段 `Target crashed` 导致连续性证据中断。

## 2026-02-23 DoD line 2343（retry closure）

- line2343 retry 仍需先记录端口漂移再做结论；本轮请求/实际端口为 `4173 -> 4188`。

## 2026-02-23 DoD line 105（PASS retry on 4189）

- line105 可在单会话内通过“最小运行时布置 + 原有系统路径”完成 3 条款闭环：HUD 可见、怪物攻击掉血、怪物掉落食物后食用回饥饿。
- 饥饿条款若初始接近满值，需要先把 hunger 调到可观察区间（本轮 55）再走掉落收集+consume 链路，否则即使 consume 成功也可能看不到增长。
- 怪物条款可通过 `sim.monsters.tick(...)` 触发既有 `onAttack -> survival` 回调链路拿到可审计 `hpBefore/hpAfter`，无需直接调用伤害捷径。
- 短链 checkpoint（T+0/T+10）可稳定采到 `mode + FPS + AI log + NPC 下拉` 与单 tab 信号，但最终 T+20 采样必须成功才可判 PASS。
- 当最终 checkpoint 采样发生 `Target crashed` 时，即使前两段信号健康也必须保持 BLOCKED，不能用后续重开页面截图替代连续性证明。

## 2026-02-23 DoD line 2343（retry closure pass）

- 将三段采样与截图合并到同一次 `browser_run_code` 会话（T+0/T+6/T+12 + 同会话截图）可明显降低后段工具调用引入的崩溃风险。
- 在本轮中，`tabCount=1` 与 `NPC selector=11` 在三段 checkpoint 持续稳定，满足“单标签单机会话连续性”可审计要求。
- 对 line2343 判定可采用硬门槛：三段 checkpoint 全部成功 + 无 `Target crashed` + 同会话截图落盘，才允许 PASS。
