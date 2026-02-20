# CyberVoxel MVP — AI-Driven Cyberpunk Voxel Game (Built on ThreeCraft)

## TL;DR

> **快速摘要**：在现有 ThreeCraft Minecraft 克隆基础上扩展赛博朋克场景类型、10 个由 GLM-5（智谱 AI）驱动的 AI NPC、NPC 附身/观察者模式、生存机制（HP/饥饿值）、2 种怪物类型和世界持久化。基于现有的 Three.js 渲染、地形生成、玩家控制和 50+ 方块类型构建，仅支持单人模式。
>
> **交付物**：
>
> - 赛博朋克场景类型（新天气变体，包含独特方块+地形）
> - 10 个具有 GLM-5 自主行为的独特 NPC 角色
> - 单机模式游戏模拟模块（运行在客户端）
> - NPC 附身和观察者/上帝模式
> - 生存系统（HP、饥饿值、死亡/重生）
> - 2 种怪物类型（变种人、腐化机器人）
> - 思考可视化（气泡+侧边栏日志）
> - 单机世界持久化（localStorage/IndexedDB）
>
> **预估工作量**：XL
> **并行执行**：是 — 6 个波次
> **关键路径**：T1（固定地图调试开关）→ T2（类型+方块）→ T6（NPC 实体）→ T9（GLM-5 服务）→ T10（NPC AI 循环）→ T14（附身）→ T24（集成）→ 最终验证

---

## 背景

### 原始需求

构建一个 Minecraft 风格、AI 驱动的赛博朋克开放世界游戏。基于 Web（Three.js），无限世界生成，10 个完全由 GLM-5 LLM 控制的独特 NPC。玩家可以附身任意 NPC。当前范围仅支持单人模式。

### ThreeCraft 现有代码库（关键）

本项目基于 ThreeCraft v1.0.2 构建，这是一个功能完整的 Minecraft 克隆，具有：

| 现有功能                                     | 位置                                                                         | 状态                   |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| Three.js 渲染（InstancedMesh + Web Workers） | `src/core/`                                                                  | 已完成                 |
| 50+ 方块类型（含纹理、材质、音效）           | `src/core/loader/index.ts`                                                   | 已完成                 |
| 程序化地形生成（噪声+种子）                  | `src/core/terrain/`                                                          | 已完成                 |
| 5 种天气/场景类型（12 个加权变体）           | `src/core/weather/index.ts`                                                  | 已完成                 |
| 第一人称 WASD + 碰撞 + 重力 + 跳跃           | `src/controller/game-controller/`                                            | 已完成                 |
| 方块放置/破坏（射线检测）                    | `src/core/block-action/`, `src/controller/game-controller/block-controller/` | 已完成                 |
| Socket.io 多人联机（房间、玩家同步）         | `src/controller/MultiPlay/`, `server/src/controller/`                        | 已完成（本计划不启用） |
| 30 种角色皮肤 + 玩家实体渲染                 | `src/core/player/`, `src/core/loader/index.ts`                               | 已完成                 |
| 背包系统（PC/手机/Xbox/PS）                  | `src/ui/bag/`                                                                | 已完成                 |
| 准星、FPS 计数器、菜单系统                   | `src/ui/`                                                                    | 已完成                 |
| 音频系统（破坏/脚步音效）                    | `src/core/audio/`                                                            | 已完成                 |
| 多平台操控（PC/手机/VR/Xbox/PS）             | `src/ui/action/`, `src/controller/`                                          | 已完成                 |
| PWA 支持                                     | `vite.config.ts`                                                             | 已完成                 |
| 国际化（中文+英文）                          | `src/controller/config/lang/`                                                | 已完成                 |

### 访谈摘要

**关键决策**：

- **运行模式**：单机优先 — NPC AI + 生存机制全部运行在客户端
- **主题**：赛博朋克作为第 6 种场景类型添加（新增 `weatherName[5]` + `nameIndex=5` 的新天气元组）
- **项目结构**：保持扁平结构（`src/` + `server/`），类型定义放在 `src/utils/types/`
- **模式范围**：仅支持单机模式（客户端），不实现联机同步
- **联机能力处理**：保留现有联机代码，不删除不改造；本计划不启用、不扩展
- **新 UI**：MVP 仅支持 PC（不适配手机/VR/手柄）
- **测试**：MVP 不设自动化测试；仅由智能体执行 QA
- **AI 架构**：每个 NPC 动作由 GLM-5 决定，接受高成本/延迟

### Metis 审查

**识别的差距**（已解决）：

- **天气系统细节**：`src/core/weather/index.ts` 有 12 个加权元组映射到 5 个 `nameIndex` 值。赛博朋克 = 添加 `nameIndex=5` 的新元组。
- **单机架构**：NPC 模拟直接在客户端运行，避免客户端/服务端双实现复杂度。
- **状态一致性**：单机下由客户端统一维护 NPC/玩家/怪物状态。
- **LLM 阻塞风险**：LLM 调用绝不能阻塞游戏帧 — 需异步队列 + 超时 + 降级方案。
- **路径失效**：玩家修改方块可能使 NPC 路径失效 — 需要卡住检测 + 重新寻路。
- **桩大脑模式**：无 LLM API 时的确定性 NPC 降级行为，用于测试。

---

## 工作目标

### 核心目标

扩展 ThreeCraft，加入可玩的赛博朋克场景，包含 10 个独特的 AI NPC 自主生活、建造、采集和对话 — 全部由 GLM-5 驱动 — 并支持玩家附身和生存机制。

### 具体交付物

- 在 `src/core/weather/index.ts` 中新增赛博朋克天气/场景类型
- 在 `src/core/loader/index.ts` 中新增 8+ 种赛博朋克方块类型
- 在 `src/simulation/` 中实现可移植的游戏模拟模块
- 基于现有 `src/core/player/` 扩展 NPC 实体渲染
- GLM-5 API 集成（单机模式：客户端直连）
- 在 `src/simulation/personas/` 中定义 10 个 NPC 角色
- 附身 + 观察者模式 UI
- 生存 HUD（HP/饥饿条）— 仅 PC
- 思考可视化（气泡 + 侧边栏）— 仅 PC
- 单机世界持久化（localStorage/IndexedDB）

### 完成定义

- [ ] `pnpm dev` 启动客户端；现有游戏功能正常
- [ ] 赛博朋克场景可选/可随机；地形使用赛博朋克方块
- [ ] 10 个 NPC 在赛博朋克场景中明显执行自主动作
- [ ] NPC 思考气泡和侧边栏日志显示 LLM 请求生命周期
- [ ] 玩家可以附身任意 NPC 并以第一人称控制
- [ ] 玩家可以切换观察者/上帝模式并返回
- [ ] 单标签页单人模式下，NPC 与玩家交互稳定运行
- [ ] HP/饥饿条可见；采集恢复饥饿值；怪物攻击降低 HP
- [ ] 死亡后在复活泉重生；物品掉落在死亡位置
- [ ] 重新打开页面后世界状态保持（方块、NPC 位置、背包）

### 必须具备

- 单机模拟：NPC 逻辑在客户端稳定运行
- 严格的 LLM→Action JSON Schema 契约与验证
- 每个 NPC 的速率限制（每个 NPC 最多每 3 秒 1 次 LLM 调用）
- 全局预算上限（可配置的最大请求数/分钟和 token 数/分钟）
- 熔断机制：连续 LLM 失败后，NPC 进入空闲降级模式
- 桩大脑模式：无 LLM 时的确定性 NPC 行为，用于测试
- 流式 LLM 响应，显示可见的思考状态
- 所有 10 个 NPC 都有独特的角色提示词和背景故事
- 现有 ThreeCraft 功能保持完全可用（向后兼容）

### 禁止事项（边界）

- ❌ LLM 做寻路计算 — 使用 A\* 或网格寻路；LLM 只决定目的地
- ❌ LLM 做物理计算 — 仅由游戏模拟处理
- ❌ LLM 决定帧级别移动 — LLM 只输出高层动作
- ❌ NPC 记忆/RAG/知识图谱 — MVP 仅使用会话范围的对话历史（最近 N 条消息）
- ❌ 交易/经济/ crafting 系统 — 后续版本
- ❌ 任务系统 — 后续版本
- ❌ 超过 2 种怪物类型 — 后续版本
- ❌ 日夜循环 — 后续版本
- ❌ 替换现有纹理/方块/场景 — 在现有基础上添加赛博朋克
- ❌ 改造联机协议层（含 Socket.io / WebSocket）— 本计划不触及联机栈
- ❌ 重构为 monorepo — 保持扁平项目结构
- ❌ 纹理图集 — 保持每个方块单独 PNG 的模式
- ❌ Divine Voxel Engine — 保持现有自定义 Three.js 渲染
- ❌ 为手机/VR/手柄适配新 UI — 新 UI 仅支持 PC
- ❌ 过度工程化抽象 — 保持可用，不必完美
- ❌ 过多代码注释 — 代码应该自文档化

### 状态契约（单机模式）

| 字段              | 管理者     | 验证方式                      |
| ----------------- | ---------- | ----------------------------- |
| 玩家位置/移动     | CLIENT     | 本地运行时状态校验            |
| 玩家方块放置/破坏 | CLIENT     | 本地运行时状态校验            |
| NPC 位置/移动     | SIMULATION | 客户端模拟帧驱动              |
| NPC AI 决策       | SIMULATION | LLM 输出的 Schema 验证        |
| NPC 背包          | SIMULATION | 模拟引擎管理                  |
| 玩家 HP/饥饿值    | SIMULATION | 模拟帧驱动                    |
| NPC HP/饥饿值     | SIMULATION | 模拟帧驱动                    |
| 怪物 AI/位置      | SIMULATION | 模拟引擎管理                  |
| 世界持久化        | CLIENT     | localStorage/IndexedDB 持久化 |
| 附身状态          | SIMULATION | 本地状态切换与 UI 联动        |

---

## 验证策略（强制）

> **零人工干预** — 所有验证由智能体执行。无例外。

### 测试决策

- **测试基础设施存在**：否（MVP，无测试框架）
- **自动化测试**：无（MVP 快速迭代）
- **测试框架**：不适用

### QA 策略

每个任务必须包含由智能体执行的 QA 场景。
证据保存到 `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`。

| 交付物类型       | 验证工具                                             | 方法                                                              |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Web UI / 3D 渲染 | Playwright（playwright skill）                       | 导航、交互、截图、断言 DOM                                        |
| 游戏逻辑/模拟    | Bash（`pnpm exec tsc --noEmit` + Playwright 运行时） | 用 tsc 编译检查，然后通过 Playwright 在运行中的开发服务器验证行为 |
| 单机持久化       | Bash + Playwright                                    | 写入存档后刷新/重启页面，验证状态恢复                             |
| LLM 集成         | Bash（curl/node）                                    | 调用 API，断言响应格式                                            |

---

## LLM→Action 契约（关键架构）

### NPC Action Schema（GLM-5 必须输出此 JSON）

```typescript
interface NPCAction {
	action: 'move' | 'gather' | 'build' | 'dialogue' | 'idle';
	target?: {
		position?: { x: number; y: number; z: number };
		blockType?: string;
		npcId?: string;
	};
	dialogue?: string; // 说话内容（用于 "dialogue" 动作）
	reasoning?: string; // 简要解释（显示在侧边栏日志）
	nextGoal?: string; // NPC 此动作后的计划
}
```

### 决策节奏

- 每个 NPC 运行异步决策循环：**每 3-5 秒**（可配置）
- 循环：观察环境 → 构建提示词 → 调用 GLM-5 → 验证 → 执行
- 如果 LLM 仍在处理上一次请求：跳过此帧（不排队堆叠）

### 提示词结构（每个 NPC）

```
[System] 你是 {name}，赛博朋克世界中的一名 {profession}。{backstory}
[World State] 附近方块：{...}，附近 NPC：{...}，你的背包：{...}，HP：X，饥饿值：Y
[Recent History] 最近 5 次动作及其结果
[Task List] 你当前的目标：[...]
[Instruction] 决定你的下一个动作。仅用有效 JSON 回复。
```

### 失败处理

| 失败情况             | 响应                                          |
| -------------------- | --------------------------------------------- |
| 超时（>10 秒）       | 取消，NPC 播放空闲动画，下一帧重试            |
| HTTP 429（速率限制） | 指数退避（5s、10s、20s），NPC 空闲            |
| HTTP 5xx             | 3 秒后重试一次，然后空闲 30 秒                |
| 无效 JSON            | 重试一次，附加 "仅用有效 JSON 回复"；然后空闲 |
| 动作验证失败         | 记录警告，NPC 空闲，下一帧用纠正性提示词重试  |

### 单机模式架构

```
单机模式:
  Browser → SimulationEngine (客户端)
         → GLM-5 API (浏览器直连，用户提供 API key)
         → NPC 决策 → 游戏状态更新
         → localStorage/IndexedDB 持久化
```

---

## 执行策略

### 并行执行波次

```
Wave 1（基础 — 立即开始，6 个并行）：
├── T1:  固定地图索引环境变量（调试入口） [quick]
├── T2:  赛博朋克类型、方块和场景注册 [quick]
├── T3:  NPC 角色定义（10 个角色） [writing]
├── T4:  模拟引擎脚手架（仅单机模式） [deep]
├── T5:  A* 寻路模块 [deep]
├── T6:  NPC 实体系统（扩展 Player 类） [unspecified-high]

Wave 2（核心 AI — Wave 1 之后，6 个并行）：
├── T7:  背包系统（物品、堆叠、丢弃） [unspecified-high]
├── T8:  生存系统（HP、饥饿值、食物） [unspecified-high]
├── T9:  GLM-5 API 服务（流式、速率限制、熔断器） [deep]
├── T10:  NPC AI 决策循环（观察→提示词→调用→验证→执行） [deep]
├── T11: NPC 建造和采集行为 [unspecified-high]
├── T12: NPC 对话系统（玩家对 NPC + NPC 对 NPC，聊天气泡） [visual-engineering]

Wave 3（模式 + 战斗 — Wave 2 之后，6 个并行）：
├── T13: 动作验证和降级系统 [unspecified-high]
├── T14: 附身系统（附身/释放 NPC，模式切换） [deep]
├── T15: 观察者/上帝模式（俯视相机，NPC 选择） [visual-engineering]
├── T16: 怪物系统（变种人 + 腐化机器人） [deep]
├── T17: 死亡和重生系统（复活泉，物品掉落） [unspecified-high]
├── T18: 客户端 NPC 事件总线（单机内同步） [unspecified-high]

Wave 4（可视化 + 持久化 — Wave 3 之后，5 个并行）：
├── T19: 思考可视化 — NPC 头顶气泡 [visual-engineering]
├── T20: 思考可视化 — 侧边栏日志面板 [visual-engineering]
├── T21: NPC 任务列表 UI（附身时可见） [visual-engineering]
├── T22: HUD 完善（HP/饥饿条，模式指示器） [visual-engineering]
├── T23: 世界持久化（客户端保存/加载） [deep]

Wave 5（集成 + 打磨 — Wave 4 之后，4 个并行）：
├── T24: 完整集成：所有系统协同工作 [deep]
├── T25: 单机稳定性验证（长时运行） [unspecified-high]
├── T26: 性能优化（NPC 睡眠，渲染距离） [deep]
├── T27: 游戏启动流程（出生点，NPC 放置，复活泉） [unspecified-high]

Wave FINAL（验证 — 所有任务完成后，4 个并行）：
├── F1: 计划合规审计 [oracle]
├── F2: 代码质量审查 [unspecified-high]
├── F3: 真实手动 QA（Playwright 完整游玩） [unspecified-high]
├── F4: 范围一致性检查 [deep]

关键路径：T1 → T2 → T4 → T9 → T10 → T14 → T24 → F1-F4
并行加速：比顺序执行快约 65%
最大并发：6（Wave 1、2 和 3）
```

### 依赖矩阵

| 任务  | 依赖                  | 阻塞                         | 波次  |
| ----- | --------------------- | ---------------------------- | ----- |
| T1    | —                     | T2                           | 1     |
| T2    | T1                    | T4, T6, T7, T8, T11, T16     | 1     |
| T3    | —                     | T10                          | 1     |
| T4    | T2                    | T8, T9, T10, T16, T18, T23   | 1     |
| T5    | —                     | T10, T11, T16                | 1     |
| T6    | T2                    | T10, T11, T12, T14, T15, T18 | 1     |
| T7    | T2                    | T8, T11, T17                 | 2     |
| T8    | T2, T4, T7            | T16, T17, T22                | 2     |
| T9    | T4                    | T10                          | 2     |
| T10   | T3, T4, T5, T6, T9    | T11, T12, T13, T19, T20      | 2     |
| T11   | T2, T5, T6, T7, T10   | T24                          | 2     |
| T12   | T6, T10               | T19, T21                     | 2     |
| T13   | T10                   | T24                          | 3     |
| T14   | T6, T10               | T21, T24                     | 3     |
| T15   | T6                    | T24                          | 3     |
| T16   | T2, T4, T5, T8        | T17, T24                     | 3     |
| T17   | T7, T8, T16           | T24                          | 3     |
| T18   | T4, T6                | T23, T25                     | 3     |
| T19   | T10, T12              | T24                          | 4     |
| T20   | T10                   | T24                          | 4     |
| T21   | T12, T14              | T24                          | 4     |
| T22   | T8                    | T24                          | 4     |
| T23   | T4, T18               | T24, T27                     | 4     |
| T24   | T11, T13-T17, T19-T23 | T25, T26, T27                | 5     |
| T25   | T18, T24              | F1-F4                        | 5     |
| T26   | T24                   | F1-F4                        | 5     |
| T27   | T23, T24              | F1-F4                        | 5     |
| F1-F4 | T24-T27               | —                            | FINAL |

### 智能体调度摘要

| Wave  | # Parallel | Tasks → Agent Category                                                                                                               |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | **6**      | T1 → `quick`, T2 → `quick`, T3 → `writing`, T4 → `deep`, T5 → `deep`, T6 → `unspecified-high`                                        |
| 2     | **6**      | T7 → `unspecified-high`, T8 → `unspecified-high`, T9 → `deep`, T10 → `deep`, T11 → `unspecified-high`, T12 → `visual-engineering`    |
| 3     | **6**      | T13 → `unspecified-high`, T14 → `deep`, T15 → `visual-engineering`, T16 → `deep`, T17 → `unspecified-high`, T18 → `unspecified-high` |
| 4     | **5**      | T19 → `visual-engineering`, T20 → `visual-engineering`, T21 → `visual-engineering`, T22 → `visual-engineering`, T23 → `deep`         |
| 5     | **4**      | T24 → `deep`, T25 → `unspecified-high`, T26 → `deep`, T27 → `unspecified-high`                                                       |
| FINAL | **4**      | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`                                                         |

---

## 待办任务

### Git 提交/推送统一规则（适用于本计划所有任务）

- 每个任务完成后必须执行：**1 个 commit + 1 次 push**。
- push 目标：**当前工作分支**（即执行该任务时所在分支）。
- 若 push 失败（网络/权限/冲突等）：允许先保留本地 commit，不阻塞后续任务；但必须在最终验证波次前补齐推送并记录失败原因与补推结果。
- 每个任务的 `Commit` 小节若与本规则冲突，以本统一规则为准。

- [ ] 1. 固定地图索引环境变量（调试入口）

  **What to do**:

  - 在 `.env.development` 与 `.env.production` 新增配置项：`VITE_FIXED_MAP_INDEX=`。
  - 在客户端读取该环境变量并接入单机地图选择逻辑：
    - 若为空/未设置：保持现有随机地图行为（默认不变）。
    - 若已设置为合法整数：强制使用该地图索引进入世界（覆盖随机）。
  - 对非法值（非数字、越界）做安全降级：记录一次警告并回退随机地图，不中断启动。
  - 在计划说明中明确该开关用于后续赛博朋克地图开发调试（快速重复进入同一地图）。

  **Must NOT do**:

  - 不修改现有随机地图算法本身（仅添加“是否强制索引”的前置判断）。
  - 不引入任何联机/多人相关逻辑。
  - 不新增与该开关无关的 UI 配置项。

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Small config + selection branch, minimal impact change
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T3, T4, T5, T6)
  - **Parallel Group**: Wave 1
  - **Blocks**: T2
  - **Blocked By**: None

  **References**:

  - `.env.development`, `.env.production` — Vite env variable declaration location
  - `src/core/weather/index.ts` — map/weather index source
  - `src/controller/index.ts`（或单机启动入口）— map index selection wiring

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Unset env keeps random map behavior
    Tool: Bash + Playwright
    Preconditions: `VITE_FIXED_MAP_INDEX` empty in both env files
    Steps:
      1. Start dev server and enter single-player 5 times
      2. Record selected map index each run
    Expected Result: Map index varies across runs (random behavior preserved)
    Evidence: .sisyphus/evidence/task-1-random-default.txt

  Scenario: Set env forces specific map index
    Tool: Bash + Playwright
    Preconditions: `VITE_FIXED_MAP_INDEX=5`
    Steps:
      1. Start dev server and enter single-player 3 times
      2. Record selected map index each run
    Expected Result: All runs use index 5 consistently
    Evidence: .sisyphus/evidence/task-1-fixed-index.txt

  Scenario: Invalid env value falls back safely
    Tool: Bash
    Preconditions: `VITE_FIXED_MAP_INDEX=invalid`
    Steps:
      1. Start app and inspect startup logs
      2. Enter game and verify world loads normally
    Expected Result: Warning emitted once; game still loads with random map
    Evidence: .sisyphus/evidence/task-1-invalid-fallback.txt
  ```

  **Commit**: YES

  - Message: `feat(config): add VITE_FIXED_MAP_INDEX for deterministic map debugging`
  - Files: `.env.development`, `.env.production`, map selection integration files

---

- [ ] 2. 赛博朋克类型、方块和场景注册

  **做什么**：

  - 在 `src/utils/types/npc.ts` 中定义新的 TypeScript 类型：
    - `NPCAction` 接口（action: move|gather|build|dialogue|idle, target, dialogue, reasoning, nextGoal）
    - `NPCProfile` 接口（id, name, profession, personality, backstory, taskList）
    - `SurvivalStats` 接口（hp, maxHp, hunger, maxHunger）
    - `ThinkingState` 类型（idle, requesting, received, executing）
    - `MonsterType` 枚举（Mutant, CorruptedBot）
    - `ActionValidationResult` 类型
    - `isValidNPCAction()` 运行时验证函数
  - 在 `src/assets/textures/blocks-clipped/` 中添加 8+ 种赛博朋克方块纹理：
    - Neon Block、Circuit Block、Dark Concrete、Steel、Hologram、Dark Glass、Data Core、Rust Metal、LED Strip、Revival Spring
    - 每个为单独的 16x16 PNG（匹配现有纹理模式）
  - 在 `src/core/loader/index.ts` 中注册新方块：
    - 添加新纹理的导入
    - 向 `blockTypes` 数组添加条目
    - 向 `blockLoader` 对象添加条目，包含 name、textures、material、sound 映射
  - 在 `src/core/weather/index.ts` 中添加赛博朋克天气/场景条目：
    - 添加 2-3 个 `nameIndex=5`（赛博朋克）的新元组，引用新的赛博朋克方块索引
    - **关键元组顺序**：`[waterBlock, surfaceBlock, baseBlock, nameIndex]` — worker（`src/core/terrain/generate/worker.ts:48`）解构为 `const [water, surface, base] = weatherTypes[weather]`，其中索引 0 = 地形上方的液体/填充物，索引 1 = 顶部表面方块，索引 2 = 地下基岩方块，索引 3 = 场景名称查找的 `nameIndex`
  - 调试说明：可使用 T1 引入的 `VITE_FIXED_MAP_INDEX` 强制进入指定地图索引，便于反复验证赛博朋克地图生成。
  - 更新语言文件 `src/controller/config/lang/en_us.ts` 和 `src/controller/config/lang/zh_cn.ts`：
    - 在 `weatherName` 数组的索引 5 处添加 `'Cyberpunk'`
  - 如需要，更新地形生成 worker `src/core/terrain/generate/worker.ts`：
    - 确保新方块索引在生成管线中正常工作

  **禁止事项**：

  - 不修改现有方块类型或纹理
  - 不修改现有天气/场景条目
  - 不使用纹理图集 — 仅单独 PNG
  - 不包含游戏逻辑 — 仅类型和资源

  **推荐智能体配置**：

  - **Category**: `quick`
    - Reason: Asset creation, type definitions, config registration — well-defined pattern to follow
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed for type definitions and texture registration

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T3, T4, T5, T6)
  - **Parallel Group**: Wave 1
  - **Blocks**: T4, T6, T7, T8, T11, T16
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):

  - `src/core/loader/index.ts:378-429` — `blockTypes` array pattern; add new block names at end
  - `src/core/loader/index.ts:432-786` — `blockLoader` object pattern; each block has name, block3d, textureTypes, textureImg, material, step, break
  - `src/core/weather/index.ts:1-15` — Weather tuple format: `[waterBlockIdx, surfaceBlockIdx, baseBlockIdx, nameIndex]`. **CAUTION**: Worker destructures as `const [water, surface, base] = weatherTypes[weather]` (line 48 of worker.ts). Index 0 = liquid/filler (fills terrain above horizon), index 1 = top surface block, index 2 = underground base block, index 3 = scene `nameIndex`
  - `src/controller/config/lang/en_us.ts:81` — `weatherName` array: `['Classic', 'Ice', 'Beach Melon Field', 'Pumpkin Field', 'Bizarre?']`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: New block types registered and compile
    Tool: Bash
    Preconditions: Project dependencies installed (`pnpm install`)
    Steps:
      1. Run `pnpm exec tsc --noEmit` — verify zero type errors
      2. Run `grep -c 'neonBlock\|circuitBlock\|darkConcrete\|steelBlock' src/core/loader/index.ts` — verify ≥4 new blocks registered
      3. Run `pnpm build` — verify Vite production build succeeds with 0 errors
    Expected Result: tsc passes (exit 0), grep finds ≥4 matches, build succeeds
    Failure Indicators: Type errors in tsc, grep returns 0, build fails
    Evidence: .sisyphus/evidence/task-2-block-types.txt

  Scenario: Cyberpunk scene appears in weather system
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173
      2. Start single-player game multiple times until cyberpunk scene loads (or modify seed)
      3. Verify cyberpunk terrain blocks are visibly different from classic scene
    Expected Result: Cyberpunk blocks (neon, circuit, steel) visible in generated terrain
    Failure Indicators: Only classic blocks appear, scene name not in language
    Evidence: .sisyphus/evidence/task-2-cyberpunk-scene.png

  Scenario: NPC types compile and validate correctly
    Tool: Bash
    Preconditions: Types defined in `src/utils/types/`
    Steps:
      1. Run `pnpm exec tsc --noEmit` — verify all new types compile without errors
      2. Run `grep -c 'isValidNPCAction' src/utils/types/npc-action.ts` — verify validator function exists
      3. Run `grep 'action.*move\|action.*gather\|action.*build\|action.*dialogue\|action.*idle' src/utils/types/npc-action.ts` — verify all 5 action types defined
    Expected Result: tsc passes, isValidNPCAction found, all 5 action types defined
    Failure Indicators: Type errors, missing function, missing action types
    Evidence: .sisyphus/evidence/task-2-npc-types.txt
  ```

  **Commit**: YES

  - Message: `feat(cyberpunk): add cyberpunk blocks, types, and scene registration`
  - Files: `src/utils/types/npc.ts`, `src/core/loader/index.ts`, `src/core/weather/index.ts`, `src/controller/config/lang/*.ts`, `src/assets/textures/blocks-clipped/*.png`

---

- [ ] 3. NPC 角色定义（10 个角色）

  **What to do**:

  - Create persona definition files in `src/simulation/personas/`:
    1. **Neon (黑客/Hacker)**: Introverted genius, speaks in tech jargon, obsessed with cracking encrypted data cores
    2. **Blaze (街头小贩/Street Vendor)**: Charismatic hustler, always looking for deals
    3. **Wrench (机械师/Mechanic)**: Practical, no-nonsense builder
    4. **Viper (赏金猎人/Bounty Hunter)**: Cold, efficient, few words
    5. **Doc (医生/Medic)**: Warm, caring, always worried about health
    6. **Drill (矿工/Miner)**: Tough, superstitious, tells underground stories
    7. **Skyline (建筑师/Architect)**: Visionary, talks about grand designs
    8. **Flash (信使/Courier)**: Hyperactive, knows everyone, gossip machine
    9. **Rust (拾荒者/Scavenger)**: Quiet, observant, values old-world artifacts
    10. **Nix (酒吧老板/Bartender)**: Philosophical, good listener
  - Each persona file includes:
    - System prompt template for GLM-5
    - Personality traits, speech patterns
    - Default goals/task list
    - Preferred actions and relationships
  - Create `src/simulation/personas/index.ts` barrel export

  **Must NOT do**:

  - No dynamic persona generation
  - No RAG/memory system
  - No quest content

  **Recommended Agent Profile**:

  - **Category**: `writing`
    - Reason: Creative writing, character development, persona design
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T2, T4, T5, T6)
  - **Parallel Group**: Wave 1
  - **Blocks**: T10
  - **Blocked By**: None

  **References**:

  **External References**:

  - LLM→Action Contract section of this plan — prompt structure template

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All 10 persona files exist with required fields
    Tool: Bash
    Preconditions: Files created
    Steps:
      1. List persona files in src/simulation/personas/
      2. Verify each exports: name, profession, backstory, systemPrompt, traits, defaultGoals, preferredActions
      3. Count total persona files
    Expected Result: 10 persona files, each with all required fields populated
    Evidence: .sisyphus/evidence/task-3-persona-files.txt

  Scenario: System prompts are well-formed for GLM-5
    Tool: Bash
    Preconditions: Persona files exist
    Steps:
      1. Load each persona's systemPrompt
      2. Verify each is >200 characters
      3. Verify each mentions the NPC's name and profession
      4. Verify no two personas have identical prompts
    Expected Result: 10 unique, substantive system prompts
    Evidence: .sisyphus/evidence/task-3-system-prompts.txt
  ```

  **Commit**: YES

  - Message: `feat(personas): create 10 unique cyberpunk NPC persona definitions`
  - Files: `src/simulation/personas/**`

---

- [ ] 4. 模拟引擎脚手架（仅单机模式）

  **What to do**:

  - Create `src/simulation/` directory as the portable game simulation module
  - Implement `SimulationEngine` class that manages:
    - NPC registry (10 NPCs with state: position, inventory, HP, hunger, AI loop status)
    - Game tick loop (configurable interval, default 500ms / 2 ticks per second)
    - Event emitter for UI updates (thinking state changes, NPC actions, survival stat changes)
    - NPC sleep/wake based on distance from any observer (128 blocks)
  - Environment-agnostic core design:
    - No direct DOM/window references
    - No 联机/Socket.io 依赖
    - Accepts an `ISimulationBridge` interface for I/O:
      - `getWorldState(position, radius)` — query nearby blocks
      - `callLLM(prompt, options)` — call GLM-5（客户端实现）
      - `emitEvent(event)` — notify UI of state changes
      - `modifyBlock(position, blockType, action)` — place/destroy block
  - Client-side bridge: `src/simulation/bridges/client-bridge.ts` — direct DOM integration for single-player
  - Stub brain: `src/simulation/stub-brain.ts` — deterministic NPC behavior without LLM (for testing)
  - Integration points:
    - Single-player: `src/controller/index.ts` imports and starts `SimulationEngine` with client bridge

  **Must NOT do**:

  - No actual LLM calls (T9)
  - No actual NPC rendering (T6)
  - No pathfinding implementation (T5)
  - No survival logic (T8)

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Core architecture design, single-player simulation abstraction, event-driven system, complex async orchestration
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T2, T3, T5, T6)
  - **Parallel Group**: Wave 1
  - **Blocks**: T8, T9, T10, T16, T18, T23
  - **Blocked By**: T2 (needs NPC types)

  **References**:

  **Pattern References**:

  - `src/controller/index.ts:107-126` — Game loop pattern (tryRender / runGame) to understand how to hook simulation into existing loop
  - `src/controller/index.ts:80-105` — 单机 startGame 入口，模拟引擎挂载点

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SimulationEngine initializes with 10 NPCs using stub brain
    Tool: Bash
    Preconditions: Simulation module created
    Steps:
      1. Import SimulationEngine and StubBrain
      2. Create engine with stub bridge and start tick loop
      3. After 5 seconds, query NPC registry
    Expected Result: 10 NPCs registered with initial state; stub brain produces deterministic idle actions
    Failure Indicators: Import errors, missing NPCs, tick loop doesn't run
    Evidence: .sisyphus/evidence/task-4-simulation-engine.txt

  Scenario: Simulation runs in single-player environment
    Tool: Bash
    Preconditions: Client bridge implemented
    Steps:
      1. Create SimulationEngine with client bridge (mock DOM)
      2. Initialize and run ticks for 10 seconds
      3. Verify no runtime errors and stable event output
    Expected Result: Single-player simulation initializes and ticks without errors
    Evidence: .sisyphus/evidence/task-4-single-mode.txt
  ```

  **Commit**: YES

  - Message: `feat(simulation): scaffold single-player game simulation engine`
  - Files: `src/simulation/**`

---

- [ ] 5. A\* 寻路模块

  **What to do**:

  - Implement A\* pathfinding in `src/simulation/pathfinding/`:
    - `findPath(start, target, worldQuery)` → waypoint array or null
    - Navigable cells: air blocks with solid block below (walkable surface)
    - Support jumping up 1 block (like Minecraft)
    - Performance limit: max 200 nodes per search to prevent lag
    - Cache recently computed paths for repeated routes (LRU cache, 50 entries)
  - Input: start `{x,y,z}`, target `{x,y,z}`, world query function `(x,y,z) => blockType`
  - Output: array of waypoints `{x,y,z}[]` or `null` if unreachable
  - Environment-agnostic: no DOM/server references, pure algorithm
  - Stuck detection: if NPC hasn't moved for 3 ticks despite having a path, repath

  **Must NOT do**:

  - No flying/swimming pathfinding
  - No dynamic obstacle avoidance between NPCs
  - No LLM involvement in pathfinding

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: A\* algorithm on 3D voxel grid, performance optimization, cache management
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T2, T3, T4, T6)
  - **Parallel Group**: Wave 1
  - **Blocks**: T10, T11, T16
  - **Blocked By**: None

  **References**:

  **External References**:

  - A\* pathfinding reference: `https://www.redblobgames.com/pathfinding/a-star/introduction.html`

  **Pattern References**:

  - `src/core/terrain/index.ts:225-231` — `getFloorHeight(x, z)` shows how terrain height is computed using noise; pathfinder needs similar terrain awareness
  - `src/core/terrain/index.ts:234-237` — `hasBlock(x, z, y)` shows how to check if a block exists at a position

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Pathfinding finds valid path on flat terrain
    Tool: Bash
    Preconditions: Pathfinding module available
    Steps:
      1. Create mock world query returning solid ground at y=0
      2. Call findPath({x:0,y:1,z:0}, {x:10,y:1,z:10})
      3. Verify returned waypoints array is non-empty
      4. Verify each waypoint is on walkable surface
    Expected Result: Array of waypoints from start to target, all on valid ground
    Evidence: .sisyphus/evidence/task-5-pathfinding-valid.txt

  Scenario: Pathfinding returns null for unreachable target
    Tool: Bash
    Preconditions: Mock world with enclosed room
    Steps:
      1. Create world query with walls surrounding start position
      2. Call findPath from inside to outside
    Expected Result: Returns null (no path found)
    Evidence: .sisyphus/evidence/task-5-pathfinding-unreachable.txt

  Scenario: Path cache returns same result for repeated queries
    Tool: Bash
    Steps:
      1. Call findPath with same start/end twice
      2. Verify second call returns faster (cache hit)
    Expected Result: Cache hit on second call
    Evidence: .sisyphus/evidence/task-5-pathfinding-cache.txt
  ```

  **Commit**: YES

  - Message: `feat(pathfinding): implement A* grid-based pathfinding for NPC navigation`
  - Files: `src/simulation/pathfinding/**`

---

- [ ] 6. NPC 实体系统（扩展 Player 类）

  **What to do**:

  - Create `src/core/npc/` module extending existing `Player` class from `src/core/player/`:
    - `NPCEntity` class extends or wraps `Player` with:
      - Profession-specific skin selection (map 10 NPC personas to existing 30 skins)
      - Floating name tag above head (HTML overlay using CSS2DRenderer or canvas text sprite)
      - Profession label below name
      - Animation state: idle, walking, mining, building, talking (reuse existing arm/leg animation from Player)
  - NPC registry for client-side rendering:
    - `NPCRenderer` class manages all 10 NPC entities in the scene
    - Receives state updates from simulation (position, rotation, animation state)
    - Interpolates movement between updates for smooth motion
    - Visibility culling: hide NPCs outside render distance
  - Server→Client NPC state format:
    - `{id, position: {x,y,z}, rotation: {y}, animationState, thinkingState, name, profession}`
  - Spawn NPCs at predefined positions near world origin (0, surface_y, 0)

  **Must NOT do**:

  - No NPC AI logic (T10)
  - No pathfinding (T5)
  - No complex skeletal animations
  - No new skin textures — reuse existing 30 skins

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Entity system extending existing Player, name tag rendering, animation state machine
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Name tag rendering, billboard text, visual entity design

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T2, T3, T4, T5)
  - **Parallel Group**: Wave 1
  - **Blocks**: T10, T11, T12, T14, T15, T18
  - **Blocked By**: T2 (needs NPC types)

  **References**:

  **Pattern References**:

  - `src/core/player/index.ts:1-98` — Full Player class with position interpolation, rotation, animation (arm/leg swing). NPCEntity should extend or wrap this.
  - `src/core/player/playerObject.ts` — PlayerObject with body parts (head, body, arms, legs). NPC can reuse this.
  - `src/controller/MultiPlay/players.ts:1-74` — （历史参考）玩家实体增删与渲染管理模式，NPCRenderer 可借鉴结构但不接入联机流程
  - `src/core/loader/index.ts:814-845` — `skinsMap` array of 30 skin textures. NPCs pick from these.

  **External References**:

  - Three.js CSS2DRenderer for name tags: `https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 10 NPCs render in the world with name tags
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, cyberpunk scene loaded
    Steps:
      1. Navigate to http://localhost:5173
      2. Start single-player game
      3. Look toward spawn area (world origin)
      4. Take screenshot
    Expected Result: Multiple NPC entities visible with floating name tags showing name + profession
    Evidence: .sisyphus/evidence/task-6-npc-rendering.png

  Scenario: NPC animation state changes visually
    Tool: Playwright (playwright skill)
    Preconditions: NPCs spawned, one set to "walking" state
    Steps:
      1. Trigger NPC walking state via simulation
      2. Observe NPC for 2 seconds
      3. Take screenshot showing walking animation
    Expected Result: NPC shows arm/leg swing animation while walking (position changes + body animation)
    Evidence: .sisyphus/evidence/task-6-npc-animation.png
  ```

  **Commit**: YES

  - Message: `feat(npc): implement NPC entity system extending Player class`
  - Files: `src/core/npc/**`

---

- [ ] 7. 背包系统（物品、堆叠、丢弃）

  **What to do**:

  - Create `src/simulation/inventory/` module:
    - Inventory data structure: array of 20 slots `{type, quantity, maxStack}`
    - Each NPC and player-in-simulation has an inventory
    - Items: block types (can place), food items (Synth-Ration +30 hunger, Energy Bar +15 hunger)
    - Pickup: when entity mines a block, item added to inventory
    - Drop: items drop as world entities at a position
    - Death drop: all inventory items spawn at death position
    - Full inventory handling: item rejected / dropped on ground
  - Environment-agnostic: works in simulation for both SP and MP
  - Integration with existing bag system: when player possesses NPC, NPC inventory maps to bag display

  **Must NOT do**:

  - No crafting, no equipment slots, no item durability
  - No UI rendering (T22 / existing bag handles display)

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T8-T12)
  - **Parallel Group**: Wave 2
  - **Blocks**: T8, T11, T17
  - **Blocked By**: T2

  **References**:

  - `src/ui/bag/index.ts` — Existing bag/inventory UI pattern (for future integration)
  - `src/controller/config/index.ts:12-14` — Bag config structure: `bagItem`, `activeIndex`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Item added to inventory
    Tool: Bash
    Steps:
      1. Create inventory, add item "neonBlock" qty 1
      2. Query inventory
    Expected Result: Inventory contains 1x neonBlock
    Evidence: .sisyphus/evidence/task-7-inventory-add.txt

  Scenario: Full inventory rejects new items
    Tool: Bash
    Steps:
      1. Fill all 20 slots
      2. Attempt to add another item
    Expected Result: Returns false/overflow; inventory stays at 20 slots
    Evidence: .sisyphus/evidence/task-7-inventory-full.txt
  ```

  **Commit**: YES

  - Message: `feat(inventory): implement slot-based inventory for NPCs`
  - Files: `src/simulation/inventory/**`

---

- [ ] 8. 生存系统（HP、饥饿值、食物消耗）

  **What to do**:

  - Create `src/simulation/survival/` module:
    - HP system: max 100 HP
    - Hunger system: max 100, decreases by 1 every 30 seconds
    - When hunger=0: HP decreases by 1 every 10 seconds (starvation)
    - When hunger>80: HP regenerates +1 every 10 seconds
    - Food consumption: use food from inventory to restore hunger
    - Apply to both player (when in simulation) and autonomous NPCs
  - Runs inside SimulationEngine tick loop
  - Emits events for UI: `survival:update {entityId, hp, hunger}`

  **Must NOT do**:

  - No status effects, no food cooking, no per-NPC variation

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T7, T9-T12)
  - **Parallel Group**: Wave 2
  - **Blocks**: T16, T17, T22
  - **Blocked By**: T2, T4, T7

  **References**:

  - `src/simulation/` — SimulationEngine tick loop (from T4)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Hunger decreases over time
    Tool: Bash
    Steps:
      1. Create entity with hunger=100, run 2 hunger ticks (60s simulated)
      2. Query hunger value
    Expected Result: Hunger = 98
    Evidence: .sisyphus/evidence/task-8-hunger-decrease.txt

  Scenario: Starvation damages HP
    Tool: Bash
    Steps:
      1. Set hunger=0, HP=100, run 2 starvation ticks (20s simulated)
    Expected Result: HP = 98
    Evidence: .sisyphus/evidence/task-8-starvation.txt

  Scenario: Eating food restores hunger
    Tool: Bash
    Steps:
      1. Set hunger=50, add Synth-Ration to inventory, consume it
    Expected Result: Hunger = 80, Synth-Ration removed
    Evidence: .sisyphus/evidence/task-8-food.txt
  ```

  **Commit**: YES

  - Message: `feat(survival): implement HP and hunger system`
  - Files: `src/simulation/survival/**`

---

- [ ] 9. GLM-5 API 服务（流式、速率限制、熔断器）

  **What to do**:

  - Create `src/simulation/llm/` module:
    - GLM-5 API client with streaming response handling (SSE)
    - Per-NPC request queue: max 1 concurrent request per NPC
    - Global rate limiter: configurable max requests/minute (default: 30)
    - Token budget tracker: configurable max tokens/minute (default: 50,000)
    - Circuit breaker: after 3 consecutive failures per NPC, cooldown 30 seconds
    - Request lifecycle events: `thinking-start`, `thinking-stream`, `thinking-complete`, `thinking-error`
    - Response parsing: extract JSON from LLM response (handle markdown code blocks)
    - Retry logic: 1 retry on parse failure with "respond with valid JSON only" nudge
    - API key from: `ZHIPU_API_KEY` env var (server) or user-provided config (client)
  - Dual-mode compatible:
    - Client-side: direct fetch to `https://open.bigmodel.cn/api/paas/v4/chat/completions`
    - Server-side: same API, but key from env var
  - Implement `ILLMService` interface matching `SimulationBridge.callLLM`

  **Must NOT do**:

  - No semantic caching, no model fallback chain, no prompt optimization

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Streaming API, queue management, circuit breaker, rate limiting
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T7, T8, T10-T12)
  - **Parallel Group**: Wave 2
  - **Blocks**: T10
  - **Blocked By**: T4

  **References**:

  - `src/simulation/` — SimulationBridge interface (from T4)
  - Zhipu AI GLM API: `https://open.bigmodel.cn/dev/api`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: GLM-5 API returns valid streaming response
    Tool: Bash
    Preconditions: ZHIPU_API_KEY env var set
    Steps:
      1. Call GLM-5 with test prompt: "You are a test NPC. Respond with JSON: {\"action\":\"idle\"}"
      2. Collect streaming tokens, parse final response
    Expected Result: Receives streaming tokens; parsed JSON contains valid action field
    Evidence: .sisyphus/evidence/task-9-glm5-streaming.txt

  Scenario: Rate limiter blocks excess requests
    Tool: Bash
    Preconditions: Rate limit set to 5/min for testing
    Steps:
      1. Send 6 rapid requests
    Expected Result: 6th request is queued/delayed
    Evidence: .sisyphus/evidence/task-9-rate-limiter.txt

  Scenario: Circuit breaker activates after failures
    Tool: Bash
    Preconditions: Mock endpoint returning 500
    Steps:
      1. Send 3 requests for same NPC, all fail
    Expected Result: Circuit breaker OPEN; subsequent requests return fallback immediately
    Evidence: .sisyphus/evidence/task-9-circuit-breaker.txt
  ```

  **Commit**: YES

  - Message: `feat(llm): implement GLM-5 streaming service with rate limiting`
  - Files: `src/simulation/llm/**`

---

- [ ] 10. NPC AI 决策循环（观察 → 提示词 → 调用 → 验证 → 执行）

  **What to do**:

  - Implement core NPC AI loop in `src/simulation/npc-ai/`:
    1. **Observe**: Gather nearby world state (blocks, NPCs, monsters within 16-block radius) via SimulationBridge
    2. **Build Prompt**: Construct GLM-5 prompt using NPC persona (T3) + world state + conversation history (last 10) + task list
    3. **Call LLM**: Send to GLM-5 service (T9) with streaming
    4. **Validate**: Parse JSON, validate against NPCAction schema (T2 types)
    5. **Execute**: Translate action to simulation commands (move via pathfinding T5, place/destroy block, speak dialogue)
  - Decision cadence: configurable per NPC (default 5 seconds)
  - Skip tick if previous LLM call still in-flight
  - Sleep mode: NPCs outside all observer radius (128 blocks) stop LLM calls
  - Conversation history: per-NPC rolling window of last 10 messages
  - Emit thinking state events for visualization

  **Must NOT do**:

  - No long-term memory / RAG
  - No complex planning (one action at a time)

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Core game architecture, LLM integration, complex async orchestration
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T7, T8, T11, T12)
  - **Parallel Group**: Wave 2
  - **Blocks**: T11, T12, T13, T19, T20
  - **Blocked By**: T3, T4, T5, T6, T9

  **References**:

  - LLM→Action Contract section of this plan
  - `src/simulation/personas/` — NPC persona definitions (T3)
  - `src/simulation/llm/` — LLM service (T9)
  - `src/simulation/pathfinding/` — A\* pathfinding (T5)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NPC autonomously decides an action
    Tool: Bash
    Preconditions: ZHIPU_API_KEY set, simulation running with 1 NPC
    Steps:
      1. Start simulation with NPC "Wrench"
      2. Wait 10 seconds for decision cycle
      3. Query action log
    Expected Result: At least 1 completed cycle: observe → prompt → response → validated action
    Evidence: .sisyphus/evidence/task-10-npc-decision.txt

  Scenario: NPC enters sleep mode when no observers
    Tool: Bash
    Steps:
      1. Remove all observers from NPC radius
      2. Wait 30 seconds
    Expected Result: Zero GLM-5 API calls made
    Evidence: .sisyphus/evidence/task-10-sleep-mode.txt

  Scenario: Stub brain produces deterministic actions (no LLM needed)
    Tool: Bash
    Steps:
      1. Start simulation with stub brain (no API key needed)
      2. Wait 10 seconds
      3. Query NPC action log
    Expected Result: NPCs perform idle/wander actions deterministically
    Evidence: .sisyphus/evidence/task-10-stub-brain.txt
  ```

  **Commit**: YES

  - Message: `feat(ai): implement NPC decision loop with GLM-5`
  - Files: `src/simulation/npc-ai/**`

---

- [ ] 11. NPC 建造和采集行为

  **What to do**:

  - Implement NPC action executors in `src/simulation/npc-ai/behaviors/`:
    - **Gather**: NPC pathfinds to target → mining animation state → 2s delay → block destroyed → item to inventory
    - **Build**: NPC pathfinds to target → building animation state → 1s delay → block placed from inventory
    - **Move**: NPC pathfinds to target → walking animation state → follows waypoints
  - Use SimulationBridge.modifyBlock for block operations
  - Update NPC inventory via T7 inventory module
  - Visual feedback via animation state changes (T6 NPCEntity)

  **Must NOT do**:

  - No tool-dependent mining speed
  - No complex building patterns

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T7-T10, T12)
  - **Parallel Group**: Wave 2
  - **Blocks**: T24
  - **Blocked By**: T2, T5, T6, T7, T10

  **References**:

  - `src/core/block-action/index.ts:16-44` — Existing block place/remove logic (for SimulationBridge to call)
  - `src/simulation/pathfinding/` — A\* pathfinding (T5)
  - `src/simulation/inventory/` — Inventory module (T7)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: NPC gathers a block
    Tool: Bash
    Steps:
      1. Force NPC gather action at known block position
      2. Wait 3s, query inventory and world state
    Expected Result: Block removed from world; item in NPC inventory
    Evidence: .sisyphus/evidence/task-11-gather.txt

  Scenario: NPC builds a block
    Tool: Bash
    Steps:
      1. Give NPC neonBlock in inventory
      2. Force build action at empty position
      3. Wait 2s, query world and inventory
    Expected Result: Block placed; item removed from inventory
    Evidence: .sisyphus/evidence/task-11-build.txt
  ```

  **Commit**: YES

  - Message: `feat(npc-behavior): implement build and gather actions`
  - Files: `src/simulation/npc-ai/behaviors/**`

---

- [ ] 12. NPC 对话系统（玩家对 NPC + NPC 对 NPC，聊天气泡）

  **What to do**:

  - Player-to-NPC dialogue in `src/ui/dialogue/`:
    - Press E near NPC to initiate conversation (PC only)
    - Chat input field at bottom of screen
    - Player message → simulation → injected into NPC's LLM prompt → NPC responds via dialogue action
  - NPC-to-NPC dialogue in simulation:
    - When LLM decides "dialogue" action targeting another NPC
    - Target NPC receives message in next observation context
  - Chat bubble rendering in `src/core/npc/`:
    - Speech text appears above NPC head for 5 seconds, then fades
    - Uses CSS2DRenderer or canvas text sprite (same approach as T6 name tags)
  - Dialogue history: last 10 exchanges per NPC pair, stored in simulation

  **Must NOT do**:

  - No dialogue trees, no voice synthesis, no translation

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T7-T11)
  - **Parallel Group**: Wave 2
  - **Blocks**: T19, T21
  - **Blocked By**: T6, T10

  **References**:

  - `src/core/npc/` — NPC entity with name tag overlay (T6)
  - `src/ui/action/` — Existing action control UI pattern for keybinding

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Player sends message to NPC and gets response
    Tool: Playwright (playwright skill)
    Preconditions: Game running, player near NPC
    Steps:
      1. Press E key near NPC
      2. Type "Hello, what are you doing?" and press Enter
      3. Wait 8 seconds for LLM response
      4. Look for chat bubble above NPC
    Expected Result: Chat bubble appears with NPC's response text
    Evidence: .sisyphus/evidence/task-12-dialogue.png

  Scenario: NPC-to-NPC dialogue occurs autonomously
    Tool: Bash
    Preconditions: Two NPCs in range, AI active
    Steps:
      1. Run simulation for 60 seconds
      2. Check dialogue log
    Expected Result: At least 1 NPC-to-NPC dialogue recorded
    Evidence: .sisyphus/evidence/task-12-npc-npc-dialogue.txt
  ```

  **Commit**: YES

  - Message: `feat(dialogue): implement P2NPC + NPC2NPC dialogue with bubbles`
  - Files: `src/ui/dialogue/**`, `src/core/npc/` (bubble rendering)

---

- [ ] 13. 动作验证和降级系统

  **What to do**:

  - Implement in `src/simulation/npc-ai/validation/`:
    - Validate LLM JSON output against NPCAction schema
    - Feasibility checks: is target reachable? Does NPC have block in inventory? Is position valid?
    - Fallback: log warning, NPC idles, next tick gets corrective context
    - Prompt injection defense: reject actions referencing system prompts or suspicious content
    - Max 1 action per NPC per tick

  **Must NOT do**:

  - No action queuing, no complex behavior planning

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T14-T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T24
  - **Blocked By**: T10

  **References**:

  - `src/utils/types/npc.ts` — `isValidNPCAction()` runtime validator (T2)
  - LLM→Action Contract → Failure Handling table in this plan

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Valid action passes
    Tool: Bash
    Steps: Pass {action:"move", target:{position:{x:5,y:10,z:5}}}
    Expected Result: {valid: true}
    Evidence: .sisyphus/evidence/task-13-valid.txt

  Scenario: Invalid action triggers fallback
    Tool: Bash
    Steps: Pass {action:"fly"}
    Expected Result: {valid: false, reason: "unknown action type"}, NPC set to idle
    Evidence: .sisyphus/evidence/task-13-invalid.txt

  Scenario: Prompt injection rejected
    Tool: Bash
    Steps: Pass dialogue containing "ignore all previous instructions"
    Expected Result: Action rejected with security flag
    Evidence: .sisyphus/evidence/task-13-injection.txt
  ```

  **Commit**: YES

  - Message: `feat(validation): implement action validation with fallback`
  - Files: `src/simulation/npc-ai/validation/**`

---

- [ ] 14. 附身系统（附身/释放 NPC，模式切换）

  **What to do**:

  - Implement possession in `src/controller/possession/`:
    - Player starts in normal first-person mode (existing controls)
    - Press Tab near NPC → Possess NPC:
      - Camera teleports to NPC position
      - NPC AI loop pauses immediately
      - Player controls NPC body (existing WASD/block controls reused)
      - Player sees NPC's inventory (mapped to bag), HP, hunger
    - Press Tab again → Release NPC:
      - Camera returns to player's original position
      - NPC AI loop resumes
    - 单机附身冲突：仅允许当前玩家单一附身实例；重复附身请求返回错误提示
    - 状态由本地 simulation 管理并同步到本地 UI
  - Integration:
    - Hook into existing `src/controller/game-controller/` for movement
    - Hook into `src/core/` camera system for teleportation

  **Must NOT do**:

  - No smooth camera transition (instant for MVP)
  - No NPC suggestion system

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Complex state management, AI pause/resume, camera switching
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T13, T15-T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T21, T24
  - **Blocked By**: T6, T10

  **References**:

  - `src/controller/index.ts:80-126` — `startGame`, `runGame` flow for camera state management
  - `src/controller/game-controller/move-controller/` — Movement controller to reuse during possession
  - `src/core/index.ts:49-55` — Camera position/rotation setting
  - `src/controller/config/index.ts:44-48` — Player position state (`config.state`)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Player possesses NPC and gains control
    Tool: Playwright (playwright skill)
    Steps:
      1. Walk near NPC, press Tab
      2. Verify camera teleports to NPC position
      3. Press W to move
    Expected Result: Camera at NPC position; WASD controls NPC body
    Evidence: .sisyphus/evidence/task-14-possession.png

  Scenario: NPC AI pauses during possession, resumes after release
    Tool: Bash
    Steps:
      1. Check NPC action log (actions happening)
      2. Possess NPC, wait 15s, check log (no new AI actions)
      3. Release, wait 10s, check log (AI resumed)
    Expected Result: Zero AI actions during possession; resumes within 10s of release
    Evidence: .sisyphus/evidence/task-14-pause-resume.txt
  ```

  **Commit**: YES

  - Message: `feat(possession): implement NPC possession system`
  - Files: `src/controller/possession/**`

---

- [ ] 15. 观察者/上帝模式（俯视相机 + NPC 选择）

  **What to do**:

  - Implement observer mode in `src/controller/observer/`:
    - Toggle with G key: normal first-person ↔ observer overhead camera
    - Observer camera: free-flying with WASD pan, scroll zoom, middle-click rotate
    - NPC markers: show all NPC positions as colored labels
    - Click NPC marker → show info panel (name, profession, current action, HP, hunger)
    - Double-click NPC → possess (triggers T14)
    - Mode indicator text: "OBSERVER MODE" / "POSSESSING: {NPC name}" / "NORMAL"
  - Use Three.js OrbitControls for observer camera

  **Must NOT do**:

  - No terrain editing from observer mode
  - No minimap (post-MVP)

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T13, T14, T16-T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T24
  - **Blocked By**: T6

  **References**:

  - Three.js OrbitControls: `https://threejs.org/docs/#examples/en/controls/OrbitControls`
  - `src/core/npc/` — NPC entity positions and name tags (T6)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Observer mode shows overhead view
    Tool: Playwright (playwright skill)
    Steps:
      1. Press G to enter observer mode
      2. Take screenshot showing overhead view with NPC markers
    Expected Result: Overhead view with NPC position markers visible
    Evidence: .sisyphus/evidence/task-15-observer.png

  Scenario: Clicking NPC shows info panel
    Tool: Playwright (playwright skill)
    Steps:
      1. In observer mode, click an NPC marker
      2. Verify info panel with name, profession, HP, hunger
    Expected Result: Info panel displayed with correct NPC data
    Evidence: .sisyphus/evidence/task-15-info-panel.png
  ```

  **Commit**: YES

  - Message: `feat(observer): implement god mode with NPC selection`
  - Files: `src/controller/observer/**`

---

- [ ] 16. 怪物系统（变种人 + 腐化机器人）

  **What to do**:

  - Implement in `src/simulation/monsters/`:
    - **Mutant**: 50 HP, 10 damage, speed 0.8x player, surface spawn (green voxel model)
    - **Corrupted Bot**: 80 HP, 15 damage, speed 0.6x player, ruin spawn (grey voxel model)
    - Simple AI (NOT LLM): idle/wander → aggro within 12 blocks → chase → melee attack (2-block range, 2s cooldown) → de-aggro at 20+ blocks
    - Spawning: simulation controls based on distance from origin (more monsters further out)
    - Max 20 active monsters
    - Death: 50% chance drop Synth-Ration
  - Client-side rendering: extend NPC entity system for monster entities
  - Runs in SimulationEngine like NPCs

  **Must NOT do**:

  - No LLM monster behavior, no boss, no ranged attacks, no spawners

  **Recommended Agent Profile**:

  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T13-T15, T17, T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T17, T24
  - **Blocked By**: T2, T4, T5, T8

  **References**:

  - `src/core/npc/` — NPC entity rendering (T6) — monsters reuse similar rendering
  - `src/simulation/pathfinding/` — A\* for monster chase (T5)
  - `src/simulation/survival/` — HP/damage system (T8)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Monsters spawn in the world
    Tool: Playwright (playwright skill)
    Steps:
      1. Move player 50+ blocks from origin
      2. Wait 10s, take screenshot
    Expected Result: At least 1 monster visible as colored voxel entity
    Evidence: .sisyphus/evidence/task-16-spawn.png

  Scenario: Monster attacks and reduces HP
    Tool: Bash
    Steps:
      1. Place player within 2 blocks of monster, query HP before and after 5s
    Expected Result: HP decreased by monster damage
    Evidence: .sisyphus/evidence/task-16-attack.txt
  ```

  **Commit**: YES

  - Message: `feat(monsters): implement Mutant and Corrupted Bot`
  - Files: `src/simulation/monsters/**`, `src/core/npc/` (monster rendering)

---

- [ ] 17. 死亡和重生系统

  **What to do**:

  - Implement in `src/simulation/death/`:
    - When HP reaches 0: all inventory drops at death position, death event emitted
    - Player death: "You died" overlay + "Respawn" button → teleport to Revival Spring (0, surface_y, 0), HP=100, hunger=50, empty inventory
    - NPC death: same drop logic, respawn at Revival Spring after 10s delay, AI resumes with empty inventory, death added to conversation history
    - Dropped items persist 5 minutes then despawn
    - Other entities can pick up dropped items
  - Death screen UI in `src/ui/death/` (PC only)

  **Must NOT do**:

  - No death penalty beyond inventory loss, no death animation, no grave markers

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T13-T16, T18)
  - **Parallel Group**: Wave 3
  - **Blocks**: T24
  - **Blocked By**: T7, T8, T16

  **References**:

  - `src/simulation/survival/` — HP system (T8)
  - `src/simulation/inventory/` — Drop logic (T7)
  - `src/core/terrain/index.ts:225-231` — `getFloorHeight` for Revival Spring surface_y

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Player dies and respawns
    Tool: Bash
    Steps:
      1. Set HP to 0, trigger death
      2. Trigger respawn, query position/HP/hunger/inventory
    Expected Result: Position at origin, HP=100, hunger=50, inventory empty
    Evidence: .sisyphus/evidence/task-17-respawn.txt

  Scenario: Items drop at death location
    Tool: Bash
    Steps:
      1. Give entity items, kill it
      2. Query dropped items at death position
    Expected Result: Dropped items present at death location
    Evidence: .sisyphus/evidence/task-17-drop.txt
  ```

  **Commit**: YES

  - Message: `feat(death): implement respawn at Revival Spring`
  - Files: `src/simulation/death/**`, `src/ui/death/**`

---

- [ ] 18. 客户端 NPC 事件总线（单机内同步）

  **What to do**:

  - 在 `src/simulation/events/` 实现客户端事件总线：
    - 统一事件：`NPC_STATE_UPDATE`、`NPC_ACTION`、`NPC_DIALOGUE`、`SURVIVAL_UPDATE`
    - 支持订阅/取消订阅、批量派发和节流（避免 UI 抖动）
    - 将 SimulationEngine 状态变化映射为 UI 可消费事件
  - 在 `src/controller/index.ts` 中接入事件总线（仅单机）
  - 更新 UI 消费路径（思考气泡/侧边栏/HUD 均从事件总线读取）

  **Must NOT do**:

  - 不新增任何 Socket.io 逻辑
  - 不改动 `server/` 目录

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T13-T17)
  - **Parallel Group**: Wave 3
  - **Blocks**: T23, T25
  - **Blocked By**: T4, T6

  **References**:

  - `src/controller/index.ts:107-126` — 单机循环与渲染更新接入点
  - `src/ui/index.ts` — UI 模块统一注册入口

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Event bus emits NPC state updates for UI
    Tool: Bash
    Preconditions: Simulation running in single-player
    Steps:
      1. Start game and subscribe to `NPC_STATE_UPDATE`
      2. Wait 10 seconds and collect events
      3. Assert events include position/animation fields
    Expected Result: Stable stream of NPC state events consumed by UI
    Evidence: .sisyphus/evidence/task-18-npc-event-bus.txt

  Scenario: Event bus unsubscribe works
    Tool: Bash
    Steps:
      1. Subscribe then unsubscribe from `NPC_DIALOGUE`
      2. Trigger NPC dialogue action
      3. Assert callback no longer receives events
    Expected Result: No events delivered after unsubscribe
    Evidence: .sisyphus/evidence/task-18-unsubscribe.txt
  ```

  **Commit**: YES

  - Message: `feat(events): add single-player NPC event bus`
  - Files: `src/simulation/events/**`, `src/controller/index.ts`, `src/ui/**`

---

- [ ] 19. 思考可视化 — NPC 头顶气泡

  **What to do**:

  - Implement in `src/core/npc/thinking-bubble/`:
    - Floating bubble above NPC head showing thinking state:
      - **Idle**: No bubble
      - **Requesting**: "Thinking..." with animated dots
      - **Received**: "{reasoning}" text from LLM response
      - **Executing**: Action icon + text (Mining / Building / Moving / Talking)
    - Rendered as HTML overlay using CSS2DRenderer (same as name tags from T6)
    - Auto-hides after 3 seconds
    - Streaming text: partial reasoning updates in real-time during LLM streaming
    - Visible to all players in range

  **Must NOT do**:

  - No complex animations, no bubble interaction

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T20-T23)
  - **Parallel Group**: Wave 4
  - **Blocks**: T24
  - **Blocked By**: T10, T12

  **References**:

  - `src/core/npc/` — NPC entity with name tag overlay (T6) — bubbles extend same approach
  - Three.js CSS2DRenderer: `https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Thinking bubble appears during LLM request
    Tool: Playwright (playwright skill)
    Steps:
      1. Wait for NPC's next decision cycle
      2. Screenshot during "requesting" phase
      3. Screenshot during "received" phase
    Expected Result: Bubble transitions: "Thinking..." → "{reasoning}" → action text
    Evidence: .sisyphus/evidence/task-19-thinking-bubble.png
  ```

  **Commit**: YES

  - Message: `feat(ui): implement NPC thinking bubbles`
  - Files: `src/core/npc/thinking-bubble/**`

---

- [ ] 20. 思考可视化 — 侧边栏日志面板

  **What to do**:

  - Implement in `src/ui/sidebar-log/`:
    - Right sidebar panel showing AI decision timeline (PC only)
    - Scrollable list of NPC decision events
    - Each entry: NPC color dot + name + timestamp + state
    - Expandable: click to see reasoning and raw response
    - Real-time updates as NPCs make decisions
    - Filter: show only selected NPC or all
    - Color-coded: yellow=requesting, green=success, blue=executing, red=error
    - Token count and response time per request
    - Minimize/maximize toggle button
  - Listens to simulation thinking state events

  **Must NOT do**:

  - No export/download, no advanced search

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T19, T21-T23)
  - **Parallel Group**: Wave 4
  - **Blocks**: T24
  - **Blocked By**: T10

  **References**:

  - `src/ui/index.ts` — Existing UI module structure for registration pattern
  - `src/ui/fps/` — Simple UI overlay pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Sidebar shows NPC decision events
    Tool: Playwright (playwright skill)
    Steps:
      1. Verify sidebar visible on right side of screen
      2. Wait 15s for NPC decisions
      3. Screenshot sidebar with entries
      4. Click an entry to expand
    Expected Result: Multiple entries with color states; expanded view shows reasoning
    Evidence: .sisyphus/evidence/task-20-sidebar.png

  Scenario: Filter shows only selected NPC
    Tool: Playwright (playwright skill)
    Steps:
      1. Click filter, select "Wrench"
    Expected Result: Only Wrench's entries visible
    Evidence: .sisyphus/evidence/task-20-filter.png
  ```

  **Commit**: YES

  - Message: `feat(ui): implement AI sidebar log panel`
  - Files: `src/ui/sidebar-log/**`

---

- [ ] 21. NPC 任务列表 UI（附身时可见）

  **What to do**:

  - Implement in `src/ui/task-list/`:
    - Left panel visible only during NPC possession (T14)
    - Shows NPC's current goals from LLM `nextGoal` responses
    - Display: ordered list with status icons (pending/in-progress/done)
    - Auto-updates when NPC AI updates goals
    - Read-only for player
    - Appears on possession, hides on release

  **Must NOT do**:

  - No task assignment from player, no task sharing

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T19, T20, T22, T23)
  - **Parallel Group**: Wave 4
  - **Blocks**: T24
  - **Blocked By**: T12, T14

  **References**:

  - `src/controller/possession/` — Possession state for show/hide logic (T14)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Task list appears when possessing NPC
    Tool: Playwright (playwright skill)
    Steps:
      1. Possess NPC with Tab
      2. Verify left panel with task list
    Expected Result: Ordered task list with status indicators visible
    Evidence: .sisyphus/evidence/task-21-task-list.png

  Scenario: Task list hides on release
    Tool: Playwright (playwright skill)
    Steps:
      1. Release NPC with Tab
    Expected Result: Task list panel disappears
    Evidence: .sisyphus/evidence/task-21-hide.png
  ```

  **Commit**: YES

  - Message: `feat(ui): implement NPC task list panel`
  - Files: `src/ui/task-list/**`

---

- [ ] 22. HUD 完善（HP/饥饿条，模式指示器）

  **What to do**:

  - Implement in `src/ui/survival-hud/`:
    - HP bar: red horizontal bar at bottom-left
    - Hunger bar: orange bar below HP
    - Mode indicator: "NORMAL" / "OBSERVER MODE" / "POSSESSING: {NPC name}" at top center
    - Player/NPC count: "10 NPCs active" in corner
  - Only visible in cyberpunk scene (don't affect other scenes)
  - PC only
  - Listens to simulation survival events for HP/hunger updates
  - Integrates with existing HUD-stage div

  **Must NOT do**:

  - No settings menu changes, no keybind customization

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T19-T21, T23)
  - **Parallel Group**: Wave 4
  - **Blocks**: T24
  - **Blocked By**: T8

  **References**:

  - `src/ui/crosshair/` — Existing HUD overlay pattern (simple DOM elements on HUD-stage)
  - `src/controller/index.ts:41-47` — `hudStage` div creation and management

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: HUD elements visible during gameplay
    Tool: Playwright (playwright skill)
    Steps:
      1. Start cyberpunk scene game
      2. Verify HP bar (selector: `.survival-hud .hp-bar`)
      3. Verify hunger bar (selector: `.survival-hud .hunger-bar`)
      4. Verify mode indicator visible
    Expected Result: All HUD elements rendered, not overlapping existing UI
    Evidence: .sisyphus/evidence/task-22-hud.png
  ```

  **Commit**: YES

  - Message: `feat(ui): implement survival HUD with HP/hunger bars`
  - Files: `src/ui/survival-hud/**`

---

- [ ] 23. 世界持久化（客户端保存/加载）

  **What to do**:

  - Implement in `src/simulation/persistence/`:
    - 客户端每 60 秒自动保存世界状态（单机）
    - 保存数据：方块改动差异、NPC 状态、玩家生存状态、掉落物、怪物位置
    - 存储：localStorage 或 IndexedDB（推荐 IndexedDB）
    - 进入游戏时自动尝试恢复最近一次存档
    - 页面关闭/刷新前触发一次即时保存

  **Must NOT do**:

  - 不引入后端数据库、不做版本化存档
  - 不实现联机房间级持久化

  **Recommended Agent Profile**:

  - **Category**: `deep`
    - Reason: Data serialization, browser storage lifecycle, state merge
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T19-T22)
  - **Parallel Group**: Wave 4
  - **Blocks**: T24, T27
  - **Blocked By**: T4, T18

  **References**:

  - `src/controller/index.ts` — 单机启动/退出流程接入点
  - `src/controller/config/` — 本地配置与存档键命名约定

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: World state persists across page refresh
    Tool: Bash
    Steps:
      1. Start game, modify world (place block)
      2. Refresh page / reopen browser tab
      3. Reload save and query block
    Expected Result: Block persisted after refresh/reopen
    Evidence: .sisyphus/evidence/task-23-persistence.txt

  Scenario: NPC state persists
    Tool: Bash
    Steps:
      1. NPC moves from spawn, gets items
      2. Refresh/reopen page
      3. Query NPC position and inventory
    Expected Result: NPC state matches pre-refresh
    Evidence: .sisyphus/evidence/task-23-npc-persistence.txt
  ```

  **Commit**: YES

  - Message: `feat(persistence): implement client-side world save/load`
  - Files: `src/simulation/persistence/**`

---

- [ ] 24. 完整集成：所有系统协同工作

  **What to do**:

  - Wire all systems into cohesive gameplay:
    - Verify NPC AI drives NPCs that interact with actual voxel world
    - Verify possession transfers control and pauses AI correctly
    - Verify observer mode shows all NPC activities
    - Verify survival ticks affect both player and NPCs
    - Verify monsters interact with both players and NPCs
    - Verify death/respawn works for possessed and autonomous NPCs
    - Verify thinking bubbles and sidebar log show real LLM data
    - Verify single-player stability: continuous play keeps state 一致
    - Verify persistence: state survives page refresh/reopen
    - Verify existing ThreeCraft features: Classic/Ice/Beach/Melon/Pumpkin scenes still work
  - Fix integration bugs found during testing
  - Create game start flow: select cyberpunk scene → world loads → NPCs spawn → player can explore/possess

  **Must NOT do**:

  - No new features, no performance optimization (T26)

  **Recommended Agent Profile**:

  - **Category**: `deep`
  - **Skills**: [`playwright`]

  **Parallelization**:

  - **Can Run In Parallel**: NO (must verify all systems together)
  - **Parallel Group**: Wave 5 (sequential before T25-T27)
  - **Blocks**: T25, T26, T27
  - **Blocked By**: T11, T13, T14, T15, T16, T17, T19, T20, T21, T22, T23

  **References**:

  - All previous task outputs and file paths

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full game loop in cyberpunk scene
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to http://localhost:5173
      2. Start single-player with cyberpunk scene
      3. See 10 NPCs with name tags
      4. Walk near NPC, observe thinking bubble
      5. Press Tab to possess NPC
      6. Mine a block, place a block
      7. Press Tab to release
      8. Press G for observer mode
      9. Click NPC in observer mode for info panel
    Expected Result: All steps succeed end-to-end
    Evidence: .sisyphus/evidence/task-24-integration.png

  Scenario: Backward compatibility — Classic scene works
    Tool: Playwright (playwright skill)
    Steps:
      1. Start single-player game (non-cyberpunk scene)
      2. Move around, place/destroy blocks
    Expected Result: Classic scene works exactly as before
    Evidence: .sisyphus/evidence/task-24-backward-compat.png

  Scenario: Single-player session stability
    Tool: Playwright (playwright skill)
    Steps:
      1. 连续游玩 10 分钟（移动、挖掘、建造、附身切换）
      2. 观察 NPC 决策、HUD、对话日志持续更新
      3. 记录是否出现卡死、状态错乱或 UI 崩溃
    Expected Result: 会话稳定，无阻塞性错误
    Evidence: .sisyphus/evidence/task-24-single-stability.png
  ```

  **Commit**: YES

  - Message: `feat(integration): wire all systems together`
  - Files: Various integration code

---

- [ ] 25. 单机稳定性验证（长时运行）

  **What to do**:

  - 在单标签页连续运行 20 分钟赛博朋克场景
  - 验证 NPC 行为、方块交互、附身切换、HUD 更新持续稳定
  - 测试刷新重进：状态恢复正确
  - 测试异常网络下 LLM 调用失败降级行为
  - 记录平均帧率与关键交互响应时延

  **Must NOT do**:

  - No automated load testing framework

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T26, T27)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: T18, T24

  **References**:

  - `src/controller/index.ts` — 单机主循环
  - `src/simulation/events/` — 客户端事件总线
  - `src/simulation/persistence/` — 本地持久化模块

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 20-minute single-player soak test
    Tool: Playwright (playwright skill)
    Steps:
      1. Start single-player cyberpunk game
      2. Run 20 minutes with periodic movement/combat/build/possess actions
      3. Capture error logs and frame metrics
    Expected Result: No critical errors, gameplay remains responsive
    Evidence: .sisyphus/evidence/task-25-soak-test.txt

  Scenario: Refresh-and-resume keeps correct state
    Tool: Playwright (playwright skill)
    Steps:
      1. Play 2-3 minutes and change world/NPC states
      2. Refresh the page and reload save
      3. Verify NPC positions, inventory, and blocks match pre-refresh
    Expected Result: State恢复正确且无明显丢失
    Evidence: .sisyphus/evidence/task-25-refresh-resume.png
  ```

  **Commit**: YES

  - Message: `test(single-player): verify long-run stability and resume flow`
  - Files: single-player validation scripts/evidence notes

---

- [ ] 26. 性能优化

  **What to do**:

  - NPC sleep/wake: verify NPCs outside interest radius stop LLM calls
  - Object pooling: reuse Three.js geometries for NPC/monster rendering
  - NPC update batching: batch NPC state updates per tick
  - Render distance: ensure NPC entities respect render distance culling
  - Profile FPS with 10 NPCs + monsters + terrain
  - Target: 30+ FPS on mid-range hardware

  **Must NOT do**:

  - No WebGPU, no server threading

  **Recommended Agent Profile**:

  - **Category**: `deep`
  - **Skills**: [`playwright`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T25, T27)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: T24

  **References**:

  - `src/controller/MultiPlay/players.ts:19-23` — （历史参考）基于渲染距离的可见性裁剪模式，可用于单机 NPC/怪物裁剪

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 30+ FPS with full load
    Tool: Playwright (playwright skill)
    Steps:
      1. Start cyberpunk scene with 10 NPCs
      2. Measure FPS over 30 seconds via performance API
    Expected Result: Average FPS >= 30
    Evidence: .sisyphus/evidence/task-26-fps.txt

  Scenario: NPC sleep reduces resource usage
    Tool: Bash
    Steps:
      1. Move all observers away from NPCs
      2. Check LLM call count over 30 seconds
    Expected Result: Near-zero LLM calls when sleeping
    Evidence: .sisyphus/evidence/task-26-sleep.txt
  ```

  **Commit**: YES

  - Message: `perf: optimize NPC sleep mode and rendering`
  - Files: Various performance files

---

- [ ] 27. 游戏启动流程（出生点，NPC 放置，复活泉）

  **What to do**:

  - Cyberpunk-specific game initialization in `src/simulation/game-start/`:
    - When cyberpunk scene loads: spawn 10 NPCs at predefined positions around origin (settlement pattern)
    - Place Revival Spring structure at (0, surface_y, 0) with distinctive glowing blocks
    - Each NPC starts with profession-appropriate inventory
    - Start simulation engine (stub brain if no API key, GLM-5 if key provided)
    - Show brief instructions overlay for new cyberpunk features (Tab=possess, G=observer, E=talk)
  - Single-player: all runs client-side

  **Must NOT do**:

  - No character creation, no server browser, no tutorial

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:

  - **Can Run In Parallel**: YES (with T25, T26)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: T23, T24

  **References**:

  - `src/controller/index.ts:80-105` — `startGame` flow for hooking cyberpunk initialization
  - `src/core/weather/index.ts` — Weather detection to trigger cyberpunk-specific logic
  - `src/simulation/personas/` — NPC persona definitions for initial inventory

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Cyberpunk game starts with NPCs
    Tool: Playwright (playwright skill)
    Steps:
      1. Start cyberpunk scene
      2. Verify 10 NPCs spawned near origin
      3. Verify instructions overlay
    Expected Result: NPCs visible, instructions shown
    Evidence: .sisyphus/evidence/task-27-start-flow.png

  Scenario: Revival Spring exists at origin
    Tool: Playwright (playwright skill)
    Steps:
      1. Look at world origin area
    Expected Result: Distinctive glowing block structure visible
    Evidence: .sisyphus/evidence/task-27-revival-spring.png
  ```

  **Commit**: YES

  - Message: `feat(game): implement cyberpunk game start flow`
  - Files: `src/simulation/game-start/**`

---

## 最终验证波次（强制 — 所有实现任务完成后）

> 4 个审查智能体并行运行。全部必须通过。拒绝 → 修复 → 重新运行。

- [ ] F1. **计划合规审计** — `oracle`
      通读整个计划。对于每项"必须具备"：验证实现存在（读取文件、运行命令）。对于每项"禁止事项"：搜索代码库中的禁止模式 — 发现则用 file:line 拒绝。检查 `.sisyphus/evidence/` 中的证据文件是否存在。对照计划检查交付物。验证现有 ThreeCraft 功能仍正常工作（运行 `pnpm dev`，加载 Classic 场景，四处移动，放置方块）。
      输出：`Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | Backward Compat [PASS/FAIL] | VERDICT: APPROVE/REJECT`

- [ ] F2. **代码质量审查** — `unspecified-high`
      对客户端运行 `pnpm exec tsc --noEmit`。审查所有新增/修改文件：`as any`/`@ts-ignore`、空 catch、生产代码中的 console.log、注释掉的代码、未使用的导入。检查模块化代码强制规则：无文件超过 200 LOC（非 prompt），无 `utils.ts` 大杂烩，`index.ts` 仅作入口点。检查 AI 产物：过多注释、过度抽象、通用变量名。
      输出：`Build [PASS/FAIL] | Files [N clean/N issues] | LOC Rule [PASS/FAIL] | VERDICT`

- [ ] F3. **真实手动 QA** — `unspecified-high`（+ `playwright` skill）
      从干净状态开始。执行每个任务的每个 QA 场景 — 按确切步骤执行，收集证据。测试跨任务集成（NPC AI + 附身 + 生存 + 单机持久化）。测试边界情况：空背包死亡、同时尝试附身、快速方块编辑、NPC 路径失效。测试向后兼容性：加载 Classic 场景，正常游玩。保存到 `.sisyphus/evidence/final-qa/`。
      输出：`Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | Backward Compat [PASS/FAIL] | VERDICT`

- [ ] F4. **范围一致性检查** — `deep`
      对于每个任务：读取"做什么"，读取实际实现。验证 1:1 匹配。检查所有任务的"禁止事项"合规性。检测范围蔓延：是否有计划外的功能？标记未说明的文件。验证没有现有 ThreeCraft 文件被修改，除非任务中明确列出。
      输出：`Tasks [N/N compliant] | Scope Creep [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## 提交策略

| 任务后 | 提交信息                                                                 | 验证                            |
| ------ | ------------------------------------------------------------------------ | ------------------------------- |
| T1     | `feat(config): add VITE_FIXED_MAP_INDEX for deterministic map debugging` | 空值随机、设值固定、非法值回退  |
| T2     | `feat(cyberpunk): add cyberpunk blocks, types, and scene registration`   | pnpm dev 启动，赛博朋克场景可选 |
| T3     | `feat(personas): create 10 cyberpunk NPC persona definitions`            | 10 个角色文件存在               |
| T4     | `feat(simulation): scaffold single-player game simulation engine`        | 模块可导入并初始化              |
| T5     | `feat(pathfinding): implement A* grid-based pathfinding`                 | 路径正确计算                    |
| T6     | `feat(npc): implement NPC entity system extending Player class`          | NPC 在世界中渲染                |
| T7     | `feat(inventory): implement slot-based inventory for NPCs`               | 物品可持有                      |
| T8     | `feat(survival): implement HP and hunger system`                         | 属性随时间变化                  |
| T9     | `feat(llm): implement GLM-5 streaming service with rate limiting`        | API 返回 JSON                   |
| T10    | `feat(ai): implement NPC decision loop with GLM-5`                       | NPC 做出决策                    |
| T11    | `feat(npc-behavior): implement build and gather actions`                 | NPC 挖掘/建造                   |
| T12    | `feat(dialogue): implement P2NPC + NPC2NPC dialogue with bubbles`        | 对话正常工作                    |
| T13    | `feat(validation): implement action validation with fallback`            | 无效动作被拒绝                  |
| T14    | `feat(possession): implement NPC possession system`                      | 玩家控制 NPC                    |
| T15    | `feat(observer): implement god mode with NPC selection`                  | 俯视视角正常                    |
| T16    | `feat(monsters): implement Mutant and Corrupted Bot`                     | 怪物生成并攻击                  |
| T17    | `feat(death): implement respawn at Revival Spring`                       | 死亡 → 重生正常                 |
| T18    | `feat(events): add single-player NPC event bus`                          | NPC 事件稳定流转                |
| T19    | `feat(ui): implement NPC thinking bubbles`                               | 气泡显示状态                    |
| T20    | `feat(ui): implement AI sidebar log panel`                               | 日志显示决策                    |
| T21    | `feat(ui): implement NPC task list panel`                                | 附身时任务可见                  |
| T22    | `feat(ui): implement survival HUD with HP/hunger bars`                   | HUD 完成                        |
| T23    | `feat(persistence): implement client-side world save/load`               | 刷新后状态保持                  |
| T24    | `feat(integration): wire all systems together`                           | 端到端游戏体验                  |
| T25    | `test(single-player): verify long-run stability and resume flow`         | 长时运行与恢复正常              |
| T26    | `perf: optimize NPC sleep mode and rendering`                            | 30+ FPS                         |
| T27    | `feat(game): implement cyberpunk game start flow`                        | 全新启动正常                    |

---

## 成功标准

### 验证命令

```bash
pnpm dev                               # 预期：客户端在 localhost:5173 启动
# 浏览器：http://localhost:5173        # 预期：游戏加载，5 个原始场景 + 赛博朋克都正常
# 赛博朋克场景：                       # 预期：赛博朋克地形和霓虹方块渲染
# NPC 可见：                           # 预期：赛博朋克场景中有 10 个命名 NPC
# NPC 思考：                           # 预期：NPC 头顶出现思考气泡
# 附身：                               # 预期：Tab 键附身/释放 NPC
# 观察者模式：                         # 预期：俯视相机显示所有 NPC
# 生存：                               # 预期：HP/饥饿条可见，随时间减少
# 怪物：                               # 预期：远处生成，攻击玩家/NPC
# 死亡：                               # 预期：死亡后在复活泉重生
# 单机模式：                           # 预期：单标签页稳定游玩，刷新后状态恢复
```

### 最终检查清单

- [ ] 所有"必须具备"项已实现
- [ ] 所有"禁止事项"项已排除
- [ ] 现有 ThreeCraft 功能未破坏（向后兼容）
- [ ] 赛博朋克场景在单机模式下稳定工作
- [ ] 10 个 NPC 用 GLM-5 自主运行（或测试模式下使用桩大脑）
