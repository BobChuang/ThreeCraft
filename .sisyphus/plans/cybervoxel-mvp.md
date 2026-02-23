# CyberVoxel MVP — AI 驱动的赛博朋克体素游戏（基于 ThreeCraft 构建）

## 简要说明（TL;DR）

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

- [x] `pnpm dev` 启动客户端；现有游戏功能正常
- [x] 赛博朋克场景可选/可随机；地形使用赛博朋克方块
- [x] 10 个 NPC 在赛博朋克场景中明显执行自主动作
- [x] NPC 思考气泡和侧边栏日志显示 LLM 请求生命周期
- [x] 玩家可以附身任意 NPC 并以第一人称控制
- [x] 玩家可以切换观察者/上帝模式并返回
- [x] 单标签页单人模式下，NPC 与玩家交互稳定运行
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

- 每个 NPC 运行异步决策循环：**每 3–5 秒**（可配置）
- 循环：观察环境 → 构建提示词 → 调用 GLM-5 → 验证 → 执行
- 若 LLM 仍在处理上一次请求：跳过本帧（不排队堆叠）

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

### 依赖关系矩阵

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

| 波次  | 并行数 | 任务 → 智能体类别                                                                                                                    |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | **6**  | T1 → `quick`, T2 → `quick`, T3 → `writing`, T4 → `deep`, T5 → `deep`, T6 → `unspecified-high`                                        |
| 2     | **6**  | T7 → `unspecified-high`, T8 → `unspecified-high`, T9 → `deep`, T10 → `deep`, T11 → `unspecified-high`, T12 → `visual-engineering`    |
| 3     | **6**  | T13 → `unspecified-high`, T14 → `deep`, T15 → `visual-engineering`, T16 → `deep`, T17 → `unspecified-high`, T18 → `unspecified-high` |
| 4     | **5**  | T19 → `visual-engineering`, T20 → `visual-engineering`, T21 → `visual-engineering`, T22 → `visual-engineering`, T23 → `deep`         |
| 5     | **4**  | T24 → `deep`, T25 → `unspecified-high`, T26 → `deep`, T27 → `unspecified-high`                                                       |
| FINAL | **4**  | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`                                                         |

---

## 待办任务

### Git 提交/推送统一规则（适用于本计划所有任务）

- 每个任务完成后必须执行：**1 个 commit + 1 次 push**。
- push 目标：**当前工作分支**（即执行该任务时所在分支）。
- 若 push 失败（网络/权限/冲突等）：允许先保留本地 commit，不阻塞后续任务；但必须在最终验证波次前补齐推送并记录失败原因与补推结果。
- 每个任务的 `Commit` 小节若与本规则冲突，以本统一规则为准。

- [x] 1. 固定地图索引环境变量（调试入口）

  **做什么**：

  - 在 `.env.development` 与 `.env.production` 新增配置项：`VITE_FIXED_MAP_INDEX=`。
  - 在客户端读取该环境变量并接入单机地图选择逻辑：
    - 若为空/未设置：保持现有随机地图行为（默认不变）。
    - 若已设置为合法整数：强制使用该地图索引进入世界（覆盖随机）。
  - 对非法值（非数字、越界）做安全降级：记录一次警告并回退随机地图，不中断启动。
  - 在计划说明中明确该开关用于后续赛博朋克地图开发调试（快速重复进入同一地图）。

  **禁止事项**：

  - 不修改现有随机地图算法本身（仅添加“是否强制索引”的前置判断）。
  - 不引入任何联机/多人相关逻辑。
  - 不新增与该开关无关的 UI 配置项。

  **推荐智能体配置**：

  - **类别**： `quick`
    - 原因：小改配置与选择分支，影响面最小
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T3, T4, T5, T6)
  - **并行组**： Wave 1
  - **阻塞**： T2
  - **被阻塞于**：无

  **参考**：

  - `.env.development`, `.env.production` — Vite 环境变量声明位置
  - `src/core/weather/index.ts` — 地图/天气索引来源
  - `src/controller/index.ts`（或单机启动入口）— 地图索引选择接入点

  **QA 场景（必选）**：

  ```
  场景：未设置环境变量时保持随机地图
    工具：Bash + Playwright
    前置条件：两个 env 文件中 `VITE_FIXED_MAP_INDEX` 均为空
    步骤：
      1. 启动开发服务器并进入单机模式 5 次
      2. 记录每次选中的地图索引
    预期结果：多次运行中地图索引不同（随机行为保留）
    证据：.sisyphus/evidence/task-1-random-default.txt

  场景：设置环境变量后强制使用指定地图索引
    工具：Bash + Playwright
    前置条件：`VITE_FIXED_MAP_INDEX=5`
    步骤：
      1. 启动开发服务器并进入单机模式 3 次
      2. 记录每次选中的地图索引
    预期结果：所有运行均一致使用索引 5
    证据：.sisyphus/evidence/task-1-fixed-index.txt

  场景：非法环境变量值安全回退
    工具：Bash
    前置条件：`VITE_FIXED_MAP_INDEX=invalid`
    步骤：
      1. 启动应用并查看启动日志
      2. 进入游戏并确认世界正常加载
    预期结果：输出一次警告；游戏仍以随机地图加载
    证据：.sisyphus/evidence/task-1-invalid-fallback.txt
  ```

  **提交**：是

  - 提交信息： `feat(config): add VITE_FIXED_MAP_INDEX for deterministic map debugging`
  - 涉及文件： `.env.development`, `.env.production`, map selection integration files

---

- [x] 2. 赛博朋克类型、方块和场景注册

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

  - **类别**： `quick`
    - 原因：资源创建、类型定义、配置注册 — 有清晰可循的既有模式
  - **技能**：[]
  - **评估后未采用的技能**：
    - `frontend-ui-ux`：类型定义与纹理注册不需要

  **并行化**：

  - **可并行执行**：是 (with T3, T4, T5, T6)
  - **并行组**： Wave 1
  - **阻塞**： T4, T6, T7, T8, T11, T16
  - **被阻塞于**：无

  **参考**：

  **模式参考**（需遵循的现有代码）：

  - `src/core/loader/index.ts:378-429` — `blockTypes` 数组模式；在末尾添加新方块名
  - `src/core/loader/index.ts:432-786` — `blockLoader` 对象模式；每方块含 name、block3d、textureTypes、textureImg、material、step、break
  - `src/core/weather/index.ts:1-15` — 天气元组格式：`[waterBlockIdx, surfaceBlockIdx, baseBlockIdx, nameIndex]`。**注意**：worker 解构为 `const [water, surface, base] = weatherTypes[weather]`（worker.ts 第 48 行）。索引 0 = 液体/填充物（地平线以上填充），索引 1 = 顶部表面方块，索引 2 = 地下基岩方块，索引 3 = 场景 `nameIndex`
  - `src/controller/config/lang/en_us.ts:81` — `weatherName` 数组：`['Classic', 'Ice', 'Beach Melon Field', 'Pumpkin Field', 'Bizarre?']`

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：新方块类型已注册且可编译
    工具：Bash
    前置条件：项目依赖已安装（`pnpm install`）
    步骤：
      1. 执行 `pnpm exec tsc --noEmit` — 确认无类型错误
      2. 执行 `grep -c 'neonBlock\|circuitBlock\|darkConcrete\|steelBlock' src/core/loader/index.ts` — 确认至少 4 个新方块已注册
      3. 执行 `pnpm build` — 确认 Vite 生产构建成功且 0 错误
    预期结果：tsc 通过（退出码 0），grep 找到 ≥4 处匹配，构建成功
    失败指标：tsc 报类型错误、grep 返回 0、构建失败
    证据：.sisyphus/evidence/task-2-block-types.txt

  场景：赛博朋克场景出现在天气系统中
    工具：Playwright（playwright skill）
    前置条件：开发服务器已运行
    步骤：
      1. 打开 http://localhost:5173
      2. 多次开始单机游戏直到加载赛博朋克场景（或修改种子）
      3. 确认赛博朋克地形方块与经典场景明显不同
    预期结果：生成地形中可见赛博朋克方块（霓虹、电路、钢铁等）
    失败指标：仅出现经典方块、语言包中无该场景名
    证据：.sisyphus/evidence/task-2-cyberpunk-scene.png

  场景：NPC 类型可编译且验证正确
    工具：Bash
    前置条件：类型已在 `src/utils/types/` 中定义
    步骤：
      1. 执行 `pnpm exec tsc --noEmit` — 确认所有新类型无错误编译
      2. 执行 `grep -c 'isValidNPCAction' src/utils/types/npc-action.ts` — 确认存在验证函数
      3. 执行 `grep 'action.*move\|action.*gather\|action.*build\|action.*dialogue\|action.*idle' src/utils/types/npc-action.ts` — 确认 5 种动作类型均已定义
    预期结果：tsc 通过，找到 isValidNPCAction，5 种动作类型均定义
    失败指标：类型错误、缺少函数、缺少动作类型
    证据：.sisyphus/evidence/task-2-npc-types.txt
  ```

  **提交**：是

  - 提交信息： `feat(cyberpunk): add cyberpunk blocks, types, and scene registration`
  - 涉及文件： `src/utils/types/npc.ts`, `src/core/loader/index.ts`, `src/core/weather/index.ts`, `src/controller/config/lang/*.ts`, `src/assets/textures/blocks-clipped/*.png`

---

- [x] 3. NPC 角色定义（10 个角色）

  **做什么**：

  - 在 `src/simulation/personas/` 下创建角色定义文件：
    1. **Neon（黑客/Hacker）**：内向天才，满口技术黑话，痴迷破解加密数据核心
    2. **Blaze（街头小贩/Street Vendor）**：有魅力的倒爷，总在找生意
    3. **Wrench（机械师/Mechanic）**：务实、不废话的建造者
    4. **Viper（赏金猎人/Bounty Hunter）**：冷酷高效，惜字如金
    5. **Doc（医生/Medic）**：温和关怀，总担心健康
    6. **Drill（矿工/Miner）**：硬汉、迷信，爱讲地下传说
    7. **Skyline（建筑师/Architect）**：有远见，爱谈宏大设计
    8. **Flash（信使/Courier）**：精力过剩，认识所有人，八卦王
    9. **Rust（拾荒者/Scavenger）**：沉默寡言、善于观察，珍视旧世界遗物
    10. **Nix（酒吧老板/Bartender）**：爱思考，善于倾听
  - 每个角色文件包含：
    - 面向 GLM-5 的系统提示模板
    - 性格特质、说话风格
    - 默认目标/任务列表
    - 偏好动作与关系
  - 创建 `src/simulation/personas/index.ts` 桶式导出

  **禁止事项**：

  - 不做动态角色生成
  - 不做 RAG/记忆系统
  - 不做任务剧情内容

  **推荐智能体配置**：

  - **类别**： `writing`
    - 原因：创意写作、角色塑造、人设设计
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T2, T4, T5, T6)
  - **并行组**： Wave 1
  - **阻塞**： T10
  - **被阻塞于**：无

  **参考**：

  **外部参考**：

  - 本计划中的 LLM→Action 契约小节 — 提示词结构模板

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：10 个角色文件均存在且含必填字段
    工具：Bash
    前置条件：文件已创建
    步骤：
      1. 列出 src/simulation/personas/ 下的角色文件
      2. 确认每个导出：name、profession、backstory、systemPrompt、traits、defaultGoals、preferredActions
      3. 统计角色文件总数
    预期结果：10 个角色文件，且均包含所有必填字段
    证据：.sisyphus/evidence/task-3-persona-files.txt

  场景：系统提示词对 GLM-5 格式正确
    工具：Bash
    前置条件：角色文件已存在
    步骤：
      1. 加载每个角色的 systemPrompt
      2. 确认每条超过 200 字符
      3. 确认每条提及该 NPC 的 name 与 profession
      4. 确认任意两个角色提示词不相同
    预期结果：10 条唯一、有实质内容的系统提示
    证据：.sisyphus/evidence/task-3-system-prompts.txt
  ```

  **提交**：是

  - 提交信息： `feat(personas): create 10 unique cyberpunk NPC persona definitions`
  - 涉及文件： `src/simulation/personas/**`

---

- [x] 4. 模拟引擎脚手架（仅单机模式）

  **做什么**：

  - 创建 `src/simulation/` 目录作为可移植的游戏模拟模块
  - 实现 `SimulationEngine` 类，负责：
    - NPC 注册表（10 个 NPC，状态含：位置、背包、HP、饥饿值、AI 循环状态）
    - 游戏 tick 循环（可配置间隔，默认 500ms / 每秒 2 tick）
    - 供 UI 更新用的事件发射（思考状态变化、NPC 动作、生存属性变化）
    - 基于与任意观察者距离（128 格）的 NPC 休眠/唤醒
  - 与环境无关的核心设计：
    - 不直接引用 DOM/window
    - 不依赖联机/Socket.io
    - 接受 `ISimulationBridge` 接口做 I/O：
      - `getWorldState(position, radius)` — 查询附近方块
      - `callLLM(prompt, options)` — 调用 GLM-5（客户端实现）
      - `emitEvent(event)` — 通知 UI 状态变化
      - `modifyBlock(position, blockType, action)` — 放置/破坏方块
  - 客户端桥接：`src/simulation/bridges/client-bridge.ts` — 单机直连 DOM 集成
  - 桩大脑：`src/simulation/stub-brain.ts` — 无 LLM 时的确定性 NPC 行为（用于测试）
  - 集成点：
    - 单机：`src/controller/index.ts` 导入并用 client bridge 启动 `SimulationEngine`

  **禁止事项**：

  - 不实现实际 LLM 调用（留待 T9）
  - 不实现实际 NPC 渲染（留待 T6）
  - 不实现寻路（留待 T5）
  - 不实现生存逻辑（留待 T8）

  **推荐智能体配置**：

  - **类别**： `deep`
    - 原因：核心架构设计、单机模拟抽象、事件驱动、复杂异步编排
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T2, T3, T5, T6)
  - **并行组**： Wave 1
  - **阻塞**： T8, T9, T10, T16, T18, T23
  - **被阻塞于**：T2（依赖 NPC 类型）

  **参考**：

  **模式参考**：

  - `src/controller/index.ts:107-126` — 游戏循环模式（tryRender / runGame），用于将模拟挂入现有循环
  - `src/controller/index.ts:80-105` — 单机 startGame 入口，模拟引擎挂载点

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：SimulationEngine 使用桩大脑初始化 10 个 NPC
    工具：Bash
    前置条件：模拟模块已创建
    步骤：
      1. 导入 SimulationEngine 与 StubBrain
      2. 用桩桥接创建引擎并启动 tick 循环
      3. 5 秒后查询 NPC 注册表
    预期结果：10 个 NPC 以初始状态注册；桩大脑产生确定性空闲动作
    失败指标：导入错误、缺少 NPC、tick 循环未运行
    证据：.sisyphus/evidence/task-4-simulation-engine.txt

  场景：单机环境下模拟正常运行
    工具：Bash
    前置条件：客户端桥接已实现
    步骤：
      1. 用客户端桥接（mock DOM）创建 SimulationEngine
      2. 初始化并运行 10 秒 tick
      3. 确认无运行时错误且事件输出稳定
    预期结果：单机模拟初始化并正常 tick，无错误
    证据：.sisyphus/evidence/task-4-single-mode.txt
  ```

  **提交**：是

  - 提交信息： `feat(simulation): scaffold single-player game simulation engine`
  - 涉及文件： `src/simulation/**`

---

- [x] 5. A\* 寻路模块

  **做什么**：

  - 在 `src/simulation/pathfinding/` 中实现 A\* 寻路：
    - `findPath(start, target, worldQuery)` → 路径点数组或 null
    - 可通行格子：下方为实心方块的空气格（可行走表面）
    - 支持向上跳 1 格（类似 Minecraft）
    - 性能限制：单次搜索最多 200 节点以防卡顿
    - 对重复路线缓存最近计算的路径（LRU 缓存，50 条）
  - 输入：起点 `{x,y,z}`、目标 `{x,y,z}`、世界查询函数 `(x,y,z) => blockType`
  - 输出：路径点数组 `{x,y,z}[]`，不可达时为 `null`
  - 与环境无关：无 DOM/服务端引用，纯算法
  - 卡住检测：若 NPC 有路径但连续 3 tick 未移动，则重新寻路

  **禁止事项**：

  - 不做飞行/游泳寻路
  - 不做 NPC 间动态避障
  - 寻路不涉及 LLM

  **推荐智能体配置**：

  - **类别**： `deep`
    - 原因：3D 体素网格上的 A\* 算法、性能优化、缓存管理
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T2, T3, T4, T6)
  - **并行组**： Wave 1
  - **阻塞**： T10, T11, T16
  - **被阻塞于**：无

  **参考**：

  **外部参考**：

  - A\* 寻路参考：`https://www.redblobgames.com/pathfinding/a-star/introduction.html`

  **模式参考**：

  - `src/core/terrain/index.ts:225-231` — `getFloorHeight(x, z)` 展示如何用噪声计算地形高度；寻路需类似的地形感知
  - `src/core/terrain/index.ts:234-237` — `hasBlock(x, z, y)` 展示如何判断某位置是否存在方块

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：寻路在平坦地形上找到有效路径
    工具：Bash
    前置条件：寻路模块可用
    步骤：
      1. 创建返回 y=0 实心地面的 mock 世界查询
      2. 调用 findPath({x:0,y:1,z:0}, {x:10,y:1,z:10})
      3. 确认返回的路径点数组非空
      4. 确认每个路径点在可行走表面
    预期结果：从起点到目标的路径点数组，均在有效地面
    证据：.sisyphus/evidence/task-5-pathfinding-valid.txt

  场景：目标不可达时寻路返回 null
    工具：Bash
    前置条件：带封闭房间的 mock 世界
    步骤：
      1. 创建起点被墙围住的世界查询
      2. 从内部向外部调用 findPath
    预期结果：返回 null（未找到路径）
    证据：.sisyphus/evidence/task-5-pathfinding-unreachable.txt

  场景：路径缓存对重复查询返回相同结果
    工具：Bash
    步骤：
      1. 用相同起点/终点调用 findPath 两次
      2. 确认第二次调用更快（缓存命中）
    预期结果：第二次调用缓存命中
    证据：.sisyphus/evidence/task-5-pathfinding-cache.txt
  ```

  **提交**：是

  - 提交信息： `feat(pathfinding): implement A* grid-based pathfinding for NPC navigation`
  - 涉及文件： `src/simulation/pathfinding/**`

---

- [x] 6. NPC 实体系统（扩展 Player 类）

  **做什么**：

  - 创建 `src/core/npc/` 模块，扩展自 `src/core/player/` 的现有 `Player` 类：
    - `NPCEntity` 类扩展或包装 `Player`，包含：
      - 按职业选择皮肤（将 10 个 NPC 人设映射到现有 30 套皮肤）
      - 头顶浮动名牌（用 CSS2DRenderer 或 canvas 文字精灵的 HTML 叠层）
      - 名字下方的职业标签
      - 动画状态：空闲、行走、挖掘、建造、说话（复用 Player 现有手臂/腿动画）
  - 客户端渲染用 NPC 注册：
    - `NPCRenderer` 类管理场景中全部 10 个 NPC 实体
    - 接收模拟的状态更新（位置、旋转、动画状态）
    - 在更新间插值移动以实现平滑
    - 可见性裁剪：隐藏渲染距离外的 NPC
  - Server→Client NPC 状态格式：
    - `{id, position: {x,y,z}, rotation: {y}, animationState, thinkingState, name, profession}`
  - 在世界原点附近 (0, surface_y, 0) 的预定位置生成 NPC

  **禁止事项**：

  - 不实现 NPC AI 逻辑（留待 T10）
  - 不实现寻路（留待 T5）
  - 不做复杂骨骼动画
  - 不新增皮肤纹理 — 复用现有 30 套皮肤

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
    - 原因：扩展现有 Player 的实体系统、名牌渲染、动画状态机
  - **技能**：[`frontend-ui-ux`]
    - `frontend-ui-ux`：名牌渲染、广告牌文字、视觉实体设计

  **并行化**：

  - **可并行执行**：是 (with T2, T3, T4, T5)
  - **并行组**： Wave 1
  - **阻塞**： T10, T11, T12, T14, T15, T18
  - **被阻塞于**：T2（依赖 NPC 类型）

  **参考**：

  **模式参考**：

  - `src/core/player/index.ts:1-98` — 完整 Player 类（位置插值、旋转、手臂/腿摆动动画）。NPCEntity 应扩展或包装此类。
  - `src/core/player/playerObject.ts` — 含身体部件（头、身、臂、腿）的 PlayerObject，NPC 可复用。
  - `src/controller/MultiPlay/players.ts:1-74` — （历史参考）玩家实体增删与渲染管理模式，NPCRenderer 可借鉴结构但不接入联机流程
  - `src/core/loader/index.ts:814-845` — 30 套皮肤纹理的 `skinsMap` 数组，NPC 从中选取。

  **外部参考**：

  - Three.js 名牌用 CSS2DRenderer：`https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer`

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：10 个 NPC 在场景中带名牌渲染
    工具：Playwright（playwright skill）
    前置条件：开发服务器已运行、赛博朋克场景已加载
    步骤：
      1. 打开 http://localhost:5173
      2. 开始单机游戏
      3. 朝向出生区域（世界原点）
      4. 截图
    预期结果：可见多个 NPC 实体及显示名字+职业的浮动名牌
    证据：.sisyphus/evidence/task-6-npc-rendering.png

  场景：NPC 动画状态在视觉上变化
    工具：Playwright（playwright skill）
    前置条件：NPC 已生成，其中一个设为 "walking" 状态
    步骤：
      1. 通过模拟触发 NPC 行走状态
      2. 观察 NPC 约 2 秒
      3. 截取行走动画截图
    预期结果：行走时 NPC 显示手臂/腿摆动动画（位置变化+身体动画）
    证据：.sisyphus/evidence/task-6-npc-animation.png
  ```

  **提交**：是

  - 提交信息： `feat(npc): implement NPC entity system extending Player class`
  - 涉及文件： `src/core/npc/**`

---

- [x] 7. 背包系统（物品、堆叠、丢弃）

  **做什么**：

  - 创建 `src/simulation/inventory/` 模块：
    - 背包数据结构：20 格数组 `{type, quantity, maxStack}`
    - 每个 NPC 与模拟内玩家均有一个背包
    - 物品：方块类型（可放置）、食物（Synth-Ration +30 饥饿、Energy Bar +15 饥饿）
    - 拾取：实体挖掘方块时物品加入背包
    - 丢弃：物品在指定位置以世界实体形式掉落
    - 死亡掉落：全部背包物品在死亡位置生成
    - 满背包处理：拒绝放入 / 掉落到地面
  - 与环境无关：在模拟中同时支持单机与联机
  - 与现有背包系统集成：玩家附身 NPC 时，NPC 背包映射到背包界面显示

  **禁止事项**：

  - 不做合成、装备槽、物品耐久
  - 不做 UI 渲染（T22 / 现有背包负责显示）

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T8-T12)
  - **并行组**： Wave 2
  - **阻塞**： T8, T11, T17
  - **被阻塞于**： T2

  **参考**：

  - `src/ui/bag/index.ts` — 现有背包/物品栏 UI 模式（供后续集成）
  - `src/controller/config/index.ts:12-14` — 背包配置结构：`bagItem`、`activeIndex`

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：物品加入背包
    工具：Bash
    步骤：
      1. 创建背包，添加物品 "neonBlock" 数量 1
      2. 查询背包
    预期结果：背包中含 1 个 neonBlock
    证据：.sisyphus/evidence/task-7-inventory-add.txt

  场景：满背包拒绝新物品
    工具：Bash
    步骤：
      1. 填满全部 20 格
      2. 尝试再添加一件物品
    预期结果：返回 false/溢出；背包保持 20 格
    证据：.sisyphus/evidence/task-7-inventory-full.txt
  ```

  **提交**：是

  - 提交信息： `feat(inventory): implement slot-based inventory for NPCs`
  - 涉及文件： `src/simulation/inventory/**`

---

- [x] 8. 生存系统（HP、饥饿值、食物消耗）

  **做什么**：

  - 创建 `src/simulation/survival/` 模块：
    - HP 系统：最大 100 HP
    - 饥饿系统：最大 100，每 30 秒减 1
    - 饥饿=0 时：每 10 秒 HP 减 1（饥饿伤害）
    - 饥饿>80 时：每 10 秒 HP 恢复 +1
    - 进食：使用背包中的食物恢复饥饿值
    - 同时作用于模拟中的玩家与自主 NPC
  - 在 SimulationEngine 的 tick 循环内运行
  - 向 UI 发射事件：`survival:update {entityId, hp, hunger}`

  **禁止事项**：

  - 不做状态效果、食物烹饪、按 NPC 差异化

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T7, T9-T12)
  - **并行组**： Wave 2
  - **阻塞**： T16, T17, T22
  - **被阻塞于**： T2, T4, T7

  **参考**：

  - `src/simulation/` — SimulationEngine tick loop (from T4)

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：饥饿值随时间下降
    工具：Bash
    步骤：
      1. 创建饥饿值=100 的实体，运行 2 次饥饿 tick（模拟 60 秒）
      2. 查询饥饿值
    预期结果：饥饿值 = 98
    证据：.sisyphus/evidence/task-8-hunger-decrease.txt

  场景：饥饿伤害 HP
    工具：Bash
    步骤：
      1. 设饥饿=0、HP=100，运行 2 次饥饿伤害 tick（模拟 20 秒）
    预期结果：HP = 98
    证据：.sisyphus/evidence/task-8-starvation.txt

  场景：进食恢复饥饿值
    工具：Bash
    步骤：
      1. 设饥饿=50，向背包添加 Synth-Ration 并消耗
    预期结果：饥饿值 = 80，Synth-Ration 被消耗
    证据：.sisyphus/evidence/task-8-food.txt
  ```

  **提交**：是

  - 提交信息： `feat(survival): implement HP and hunger system`
  - 涉及文件： `src/simulation/survival/**`

---

- [x] 9. GLM-5 API 服务（流式、速率限制、熔断器）

  **做什么**：

  - 创建 `src/simulation/llm/` 模块：
    - GLM-5 API 客户端，支持流式响应（SSE）
    - 每 NPC 请求队列：每 NPC 最多 1 个并发请求
    - 全局速率限制：可配置每分钟最大请求数（默认 30）
    - Token 预算追踪：可配置每分钟最大 token 数（默认 50,000）
    - 熔断器：每 NPC 连续 3 次失败后冷却 30 秒
    - 请求生命周期事件：`thinking-start`、`thinking-stream`、`thinking-complete`、`thinking-error`
    - 响应解析：从 LLM 响应中提取 JSON（处理 markdown 代码块）
    - 重试逻辑：解析失败时重试 1 次并附加「仅用有效 JSON 回复」提示
    - API 密钥来源：服务端用环境变量 `ZHIPU_API_KEY`，客户端用用户配置
  - 双模式兼容：
    - 客户端：直连 fetch `https://open.bigmodel.cn/api/paas/v4/chat/completions`
    - 服务端：同一 API，密钥来自环境变量
  - 实现与 `SimulationBridge.callLLM` 匹配的 `ILLMService` 接口

  **禁止事项**：

  - 不做语义缓存、模型回退链、提示词优化

  **推荐智能体配置**：

  - **类别**： `deep`
    - 原因： Streaming API, queue management, circuit breaker, rate limiting
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T7, T8, T10-T12)
  - **并行组**： Wave 2
  - **阻塞**： T10
  - **被阻塞于**： T4

  **参考**：

  - `src/simulation/` — SimulationBridge interface (from T4)
  - Zhipu AI GLM API: `https://open.bigmodel.cn/dev/api`

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：GLM-5 API 返回有效流式响应
    工具：Bash
    前置条件：已设置环境变量 ZHIPU_API_KEY
    步骤：
      1. 用测试提示调用 GLM-5："You are a test NPC. Respond with JSON: {\"action\":\"idle\"}"
      2. 收集流式 token，解析最终响应
    预期结果：收到流式 token；解析出的 JSON 含有效 action 字段
    证据：.sisyphus/evidence/task-9-glm5-streaming.txt

  场景：速率限制拦截超额请求
    工具：Bash
    前置条件：测试将速率限制设为 5 次/分钟
    步骤：
      1. 连续发送 6 次请求
    预期结果：第 6 次请求被排队/延迟
    证据：.sisyphus/evidence/task-9-rate-limiter.txt

  场景：连续失败后熔断器触发
    工具：Bash
    前置条件：Mock 端点返回 500
    步骤：
      1. 对同一 NPC 发送 3 次请求，均失败
    预期结果：熔断器打开；后续请求立即返回降级结果
    证据：.sisyphus/evidence/task-9-circuit-breaker.txt
  ```

  **提交**：是

  - 提交信息： `feat(llm): implement GLM-5 streaming service with rate limiting`
  - 涉及文件： `src/simulation/llm/**`

---

- [x] 10. NPC AI 决策循环（观察 → 提示词 → 调用 → 验证 → 执行）

  **做什么**：

  - 在 `src/simulation/npc-ai/` 中实现 NPC AI 核心循环：
    1. **观察**：通过 SimulationBridge 收集附近世界状态（16 格内方块、NPC、怪物）
    2. **构建提示**：用 NPC 人设（T3）+ 世界状态 + 对话历史（最近 10 条）+ 任务列表构建 GLM-5 提示
    3. **调用 LLM**：以流式方式发送给 GLM-5 服务（T9）
    4. **验证**：解析 JSON，按 NPCAction 模式（T2 类型）校验
    5. **执行**：将动作转为模拟命令（经 T5 寻路移动、放置/破坏方块、说对话）
  - 决策节奏：可按 NPC 配置（默认 5 秒）
  - 若上一次 LLM 调用仍在进行则跳过本 tick
  - 休眠模式：在所有观察者 128 格外的 NPC 停止 LLM 调用
  - 对话历史：每 NPC 最近 10 条消息的滚动窗口
  - 发射思考状态事件供可视化

  **禁止事项**：

  - 不做长期记忆 / RAG
  - 不做复杂规划（一次一个动作）

  **推荐智能体配置**：

  - **类别**： `deep`
    - 原因： Core game architecture, LLM integration, complex async orchestration
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T7, T8, T11, T12)
  - **并行组**： Wave 2
  - **阻塞**： T11, T12, T13, T19, T20
  - **被阻塞于**： T3, T4, T5, T6, T9

  **参考**：

  - LLM→Action Contract section of this plan
  - `src/simulation/personas/` — NPC persona definitions (T3)
  - `src/simulation/llm/` — LLM service (T9)
  - `src/simulation/pathfinding/` — A\* pathfinding (T5)

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：NPC 自主做出一次决策
    工具：Bash
    前置条件：已设置 ZHIPU_API_KEY，模拟运行且含 1 个 NPC
    步骤：
      1. 用 NPC "Wrench" 启动模拟
      2. 等待 10 秒完成决策周期
      3. 查询动作日志
    预期结果：至少完成 1 个周期：观察 → 提示 → 响应 → 校验后执行
    证据：.sisyphus/evidence/task-10-npc-decision.txt

  场景：无观察者时 NPC 进入休眠
    工具：Bash
    步骤：
      1. 将全部观察者移出 NPC 范围
      2. 等待 30 秒
    预期结果：未发起 GLM-5 API 调用
    证据：.sisyphus/evidence/task-10-sleep-mode.txt

  场景：桩大脑产生确定性动作（无需 LLM）
    工具：Bash
    步骤：
      1. 用桩大脑启动模拟（无需 API 密钥）
      2. 等待 10 秒
      3. 查询 NPC 动作日志
    预期结果：NPC 以确定性方式执行空闲/徘徊动作
    证据：.sisyphus/evidence/task-10-stub-brain.txt
  ```

  **提交**：是

  - 提交信息： `feat(ai): implement NPC decision loop with GLM-5`
  - 涉及文件： `src/simulation/npc-ai/**`

---

- [x] 11. NPC 建造和采集行为

  **做什么**：

  - 在 `src/simulation/npc-ai/behaviors/` 中实现 NPC 动作执行器：
    - **采集**：NPC 寻路至目标 → 挖掘动画状态 → 2 秒延迟 → 方块被破坏 → 物品入背包
    - **建造**：NPC 寻路至目标 → 建造动画状态 → 1 秒延迟 → 从背包放置方块
    - **移动**：NPC 寻路至目标 → 行走动画状态 → 沿路径点移动
  - 方块操作使用 SimulationBridge.modifyBlock
  - 通过 T7 背包模块更新 NPC 背包
  - 通过 T6 NPCEntity 的动画状态变化提供视觉反馈

  **禁止事项**：

  - 不做依赖工具挖掘速度
  - 不做复杂建造图案

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T7-T10, T12)
  - **并行组**： Wave 2
  - **阻塞**： T24
  - **被阻塞于**： T2, T5, T6, T7, T10

  **参考**：

  - `src/core/block-action/index.ts:16-44` — Existing block place/remove logic (for SimulationBridge to call)
  - `src/simulation/pathfinding/` — A\* pathfinding (T5)
  - `src/simulation/inventory/` — Inventory module (T7)

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：NPC 采集一个方块
    工具：Bash
    步骤：
      1. 在已知方块位置强制 NPC 执行采集
      2. 等待 3 秒，查询背包与世界状态
    预期结果：世界中方块被移除；物品进入 NPC 背包
    证据：.sisyphus/evidence/task-11-gather.txt

  场景：NPC 放置一个方块
    工具：Bash
    步骤：
      1. 在背包中给予 NPC neonBlock
      2. 在空位强制执行建造
      3. 等待 2 秒，查询世界与背包
    预期结果：方块被放置；背包中该物品减少
    证据：.sisyphus/evidence/task-11-build.txt
  ```

  **提交**：是

  - 提交信息： `feat(npc-behavior): implement build and gather actions`
  - 涉及文件： `src/simulation/npc-ai/behaviors/**`

---

- [x] 12. NPC 对话系统（玩家对 NPC + NPC 对 NPC，聊天气泡）

  **做什么**：

  - 玩家对 NPC 对话在 `src/ui/dialogue/`：
    - 靠近 NPC 按 E 发起对话（仅 PC）
    - 屏幕底部聊天输入框
    - 玩家消息 → 模拟 → 注入 NPC 的 LLM 提示 → NPC 通过 dialogue 动作回复
  - 模拟内 NPC 对 NPC 对话：
    - 当 LLM 决定以另一 NPC 为目标的 "dialogue" 动作时
    - 目标 NPC 在下一轮观察上下文中收到消息
  - `src/core/npc/` 中的聊天气泡渲染：
    - 发言文字在 NPC 头顶显示 5 秒后淡出
    - 使用 CSS2DRenderer 或 canvas 文字精灵（与 T6 名牌相同方式）
  - 对话历史：每对 NPC 最近 10 轮交换，存于模拟中

  **禁止事项**：

  - 不做对话树、语音合成、翻译

  **推荐智能体配置**：

  - **类别**： `visual-engineering`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T7-T11)
  - **并行组**： Wave 2
  - **阻塞**： T19, T21
  - **被阻塞于**： T6, T10

  **参考**：

  - `src/core/npc/` — NPC entity with name tag overlay (T6)
  - `src/ui/action/` — Existing action control UI pattern for keybinding

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：玩家向 NPC 发消息并得到回复
    工具：Playwright（playwright skill）
    前置条件：游戏运行中，玩家靠近 NPC
    步骤：
      1. 靠近 NPC 按 E
      2. 输入 "Hello, what are you doing?" 并回车
      3. 等待 8 秒 LLM 响应
      4. 查看 NPC 头顶聊天气泡
    预期结果：出现含 NPC 回复文字的聊天气泡
    证据：.sisyphus/evidence/task-12-dialogue.png

  场景：NPC 对 NPC 对话自主发生
    工具：Bash
    前置条件：两名 NPC 在范围内且 AI 开启
    步骤：
      1. 运行模拟 60 秒
      2. 检查对话日志
    预期结果：至少记录 1 次 NPC 对 NPC 对话
    证据：.sisyphus/evidence/task-12-npc-npc-dialogue.txt
  ```

  **提交**：是

  - 提交信息： `feat(dialogue): implement P2NPC + NPC2NPC dialogue with bubbles`
  - 涉及文件： `src/ui/dialogue/**`, `src/core/npc/` (bubble rendering)

---

- [x] 13. 动作验证和降级系统

  **做什么**：

  - 在 `src/simulation/npc-ai/validation/` 中实现：
    - 按 NPCAction 模式校验 LLM JSON 输出
    - 可行性检查：目标是否可达？NPC 背包是否有该方块？位置是否合法？
    - 降级：记录警告、NPC 空闲、下一 tick 注入纠正性上下文
    - 提示注入防护：拒绝引用系统提示或可疑内容的动作
    - 每 NPC 每 tick 最多 1 个动作

  **禁止事项**：

  - 不做动作排队、复杂行为规划

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T14-T18)
  - **并行组**： Wave 3
  - **阻塞**： T24
  - **被阻塞于**： T10

  **参考**：

  - `src/utils/types/npc.ts` — `isValidNPCAction()` runtime validator (T2)
  - LLM→Action Contract → Failure Handling table in this plan

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：有效动作通过
    工具：Bash
    步骤：传入 {action:"move", target:{position:{x:5,y:10,z:5}}}
    预期结果：{valid: true}
    证据：.sisyphus/evidence/task-13-valid.txt

  场景：无效动作触发降级
    工具：Bash
    步骤：传入 {action:"fly"}
    预期结果：{valid: false, reason: "unknown action type"}，NPC 设为空闲
    证据：.sisyphus/evidence/task-13-invalid.txt

  场景：拒绝提示注入
    工具：Bash
    步骤：传入含 "ignore all previous instructions" 的 dialogue
    预期结果：动作因安全标记被拒绝
    证据：.sisyphus/evidence/task-13-injection.txt
  ```

  **提交**：是

  - 提交信息： `feat(validation): implement action validation with fallback`
  - 涉及文件： `src/simulation/npc-ai/validation/**`

---

- [x] 14. 附身系统（附身/释放 NPC，模式切换）

  **做什么**：

  - 在 `src/controller/possession/` 中实现附身：
    - 玩家以普通第一人称模式开始（沿用现有操控）
    - 靠近 NPC 按 Tab → 附身该 NPC：
      - 相机传送到 NPC 位置
      - NPC AI 循环立即暂停
      - 玩家操控 NPC 身体（复用现有 WASD/方块操控）
      - 玩家看到 NPC 背包（映射到背包界面）、HP、饥饿值
    - 再次按 Tab → 释放 NPC：
      - 相机回到玩家原位置
      - NPC AI 循环恢复
    - 单机附身冲突：仅允许当前玩家单一附身实例；重复附身请求返回错误提示
    - 状态由本地 simulation 管理并同步到本地 UI
  - 集成：
    - 挂接到现有 `src/controller/game-controller/` 的移动逻辑
    - 挂接到 `src/core/` 的相机系统实现传送

  **禁止事项**：

  - 不做平滑相机过渡（MVP 为瞬间切换）
  - 不做 NPC 推荐系统

  **推荐智能体配置**：

  - **类别**： `deep`
    - 原因： Complex state management, AI pause/resume, camera switching
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T13, T15-T18)
  - **并行组**： Wave 3
  - **阻塞**： T21, T24
  - **被阻塞于**： T6, T10

  **参考**：

  - `src/controller/index.ts:80-126` — `startGame`, `runGame` flow for camera state management
  - `src/controller/game-controller/move-controller/` — Movement controller to reuse during possession
  - `src/core/index.ts:49-55` — Camera position/rotation setting
  - `src/controller/config/index.ts:44-48` — Player position state (`config.state`)

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：玩家附身 NPC 并获得控制
    工具：Playwright（playwright skill）
    步骤：
      1. 走到 NPC 旁按 Tab
      2. 确认相机传送到 NPC 位置
      3. 按 W 移动
    预期结果：相机在 NPC 位置；WASD 控制 NPC 身体
    证据：.sisyphus/evidence/task-14-possession.png

  场景：附身期间 NPC AI 暂停，释放后恢复
    工具：Bash
    步骤：
      1. 查看 NPC 动作日志（有动作产生）
      2. 附身 NPC，等待 15 秒，再查日志（无新 AI 动作）
      3. 释放，等待 10 秒，再查日志（AI 已恢复）
    预期结果：附身期间无 AI 动作；释放后 10 秒内恢复
    证据：.sisyphus/evidence/task-14-pause-resume.txt
  ```

  **提交**：是

  - 提交信息： `feat(possession): implement NPC possession system`
  - 涉及文件： `src/controller/possession/**`

---

- [x] 15. 观察者/上帝模式（俯视相机 + NPC 选择）

  **做什么**：

  - 在 `src/controller/observer/` 中实现观察者模式：
    - 按 G 切换：普通第一人称 ↔ 观察者俯视相机
    - 观察者相机：WASD 平移、滚轮缩放、中键旋转的自由飞行
    - NPC 标记：以彩色标签显示所有 NPC 位置
    - 点击 NPC 标记 → 显示信息面板（名字、职业、当前动作、HP、饥饿值）
    - 双击 NPC → 附身（触发 T14）
    - 模式指示文字："观察者模式" / "附身：{NPC 名}" / "普通"
  - 观察者相机使用 Three.js OrbitControls

  **禁止事项**：

  - 观察者模式下不编辑地形
  - 不做小地图（MVP 之后）

  **推荐智能体配置**：

  - **类别**： `visual-engineering`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T13, T14, T16-T18)
  - **并行组**： Wave 3
  - **阻塞**： T24
  - **被阻塞于**： T6

  **参考**：

  - Three.js OrbitControls: `https://threejs.org/docs/#examples/en/controls/OrbitControls`
  - `src/core/npc/` — NPC entity positions and name tags (T6)

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：观察者模式显示俯视视角
    工具：Playwright（playwright skill）
    步骤：
      1. 按 G 进入观察者模式
      2. 截取带 NPC 标记的俯视图
    预期结果：俯视视角中可见 NPC 位置标记
    证据：.sisyphus/evidence/task-15-observer.png

  场景：点击 NPC 显示信息面板
    工具：Playwright（playwright skill）
    步骤：
      1. 在观察者模式中点击一个 NPC 标记
      2. 确认信息面板显示名字、职业、HP、饥饿值
    预期结果：信息面板显示正确 NPC 数据
    证据：.sisyphus/evidence/task-15-info-panel.png
  ```

  **提交**：是

  - 提交信息： `feat(observer): implement god mode with NPC selection`
  - 涉及文件： `src/controller/observer/**`

---

- [x] 16. 怪物系统（变种人 + 腐化机器人）

  **做什么**：

  - 在 `src/simulation/monsters/` 中实现：
    - **变种人（Mutant）**：50 HP、10 伤害、速度 0.8 倍玩家、地表生成（绿色体素模型）
    - **腐化机器人（Corrupted Bot）**：80 HP、15 伤害、速度 0.6 倍玩家、废墟生成（灰色体素模型）
    - 简单 AI（非 LLM）：空闲/徘徊 → 12 格内仇恨 → 追击 → 近战攻击（2 格范围、2 秒冷却）→ 20+ 格脱战
    - 生成：由模拟按与原点距离控制（越远怪物越多）
    - 最多 20 个活跃怪物
    - 死亡：50% 概率掉落 Synth-Ration
  - 客户端渲染：扩展 NPC 实体系统以渲染怪物实体
  - 与 NPC 一样在 SimulationEngine 中运行

  **禁止事项**：

  - 怪物行为不用 LLM、不做 Boss、不做远程攻击、不做刷怪笼

  **推荐智能体配置**：

  - **类别**： `deep`
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T13-T15, T17, T18)
  - **并行组**： Wave 3
  - **阻塞**： T17, T24
  - **被阻塞于**： T2, T4, T5, T8

  **参考**：

  - `src/core/npc/` — NPC entity rendering (T6) — monsters reuse similar rendering
  - `src/simulation/pathfinding/` — A\* for monster chase (T5)
  - `src/simulation/survival/` — HP/damage system (T8)

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：怪物在场景中生成
    工具：Playwright（playwright skill）
    步骤：
      1. 将玩家移到距原点 50+ 格
      2. 等待 10 秒并截图
    预期结果：至少 1 个怪物以彩色体素实体可见
    证据：.sisyphus/evidence/task-16-spawn.png

  场景：怪物攻击并降低 HP
    工具：Bash
    步骤：
      1. 将玩家放在怪物 2 格内，查询 5 秒前后 HP
    预期结果：HP 因怪物伤害下降
    证据：.sisyphus/evidence/task-16-attack.txt
  ```

  **提交**：是

  - 提交信息： `feat(monsters): implement Mutant and Corrupted Bot`
  - 涉及文件： `src/simulation/monsters/**`, `src/core/npc/` (monster rendering)

---

- [x] 17. 死亡和重生系统

  **做什么**：

  - 在 `src/simulation/death/` 中实现：
    - HP 归 0 时：全部背包在死亡位置掉落，发射死亡事件
    - 玩家死亡：「你已死亡」叠层 +「复活」按钮 → 传送到复活泉 (0, surface_y, 0)，HP=100、饥饿=50、背包清空
    - NPC 死亡：同样掉落逻辑，10 秒后在复活泉重生，AI 恢复、背包清空，死亡写入对话历史
    - 掉落物保留 5 分钟后消失
    - 其他实体可拾取掉落物
  - 死亡界面 UI 在 `src/ui/death/`（仅 PC）

  **禁止事项**：

  - 除背包损失外无额外死亡惩罚、不做死亡动画、不做墓碑

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T13-T16, T18)
  - **并行组**： Wave 3
  - **阻塞**： T24
  - **被阻塞于**： T7, T8, T16

  **参考**：

  - `src/simulation/survival/` — HP system (T8)
  - `src/simulation/inventory/` — Drop logic (T7)
  - `src/core/terrain/index.ts:225-231` — `getFloorHeight` for Revival Spring surface_y

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：玩家死亡并复活
    工具：Bash
    步骤：
      1. 将 HP 设为 0 触发死亡
      2. 触发复活，查询位置/HP/饥饿/背包
    预期结果：位置在原点，HP=100、饥饿=50、背包为空
    证据：.sisyphus/evidence/task-17-respawn.txt

  场景：物品在死亡位置掉落
    工具：Bash
    步骤：
      1. 给予实体物品并击杀
      2. 查询死亡位置的掉落物
    预期结果：死亡位置存在掉落物
    证据：.sisyphus/evidence/task-17-drop.txt
  ```

  **提交**：是

  - 提交信息： `feat(death): implement respawn at Revival Spring`
  - 涉及文件： `src/simulation/death/**`, `src/ui/death/**`

---

- [x] 18. 客户端 NPC 事件总线（单机内同步）

  **做什么**：

  - 在 `src/simulation/events/` 实现客户端事件总线：
    - 统一事件：`NPC_STATE_UPDATE`、`NPC_ACTION`、`NPC_DIALOGUE`、`SURVIVAL_UPDATE`
    - 支持订阅/取消订阅、批量派发和节流（避免 UI 抖动）
    - 将 SimulationEngine 状态变化映射为 UI 可消费事件
  - 在 `src/controller/index.ts` 中接入事件总线（仅单机）
  - 更新 UI 消费路径（思考气泡/侧边栏/HUD 均从事件总线读取）

  **禁止事项**：

  - 不新增任何 Socket.io 逻辑
  - 不改动 `server/` 目录

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T13-T17)
  - **并行组**： Wave 3
  - **阻塞**： T23, T25
  - **被阻塞于**： T4, T6

  **参考**：

  - `src/controller/index.ts:107-126` — 单机循环与渲染更新接入点
  - `src/ui/index.ts` — UI 模块统一注册入口

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景： Event bus emits NPC state updates for UI
    工具： Bash
    前置条件： Simulation running in single-player
    步骤：
      1. Start game and subscribe to `NPC_STATE_UPDATE`
      2. Wait 10 seconds and collect events
      3. Assert events include position/animation fields
    预期结果： Stable stream of NPC state events consumed by UI
    证据： .sisyphus/evidence/task-18-npc-event-bus.txt

  场景： Event bus unsubscribe works
    工具： Bash
    步骤：
      1. Subscribe then unsubscribe from `NPC_DIALOGUE`
      2. Trigger NPC dialogue action
      3. Assert callback no longer receives events
    预期结果： No events delivered after unsubscribe
    证据： .sisyphus/evidence/task-18-unsubscribe.txt
  ```

  **提交**：是

  - 提交信息： `feat(events): add single-player NPC event bus`
  - 涉及文件： `src/simulation/events/**`, `src/controller/index.ts`, `src/ui/**`

---

- [x] 19. 思考可视化 — NPC 头顶气泡

  **做什么**：

  - 在 `src/core/npc/thinking-bubble/` 中实现：
    - NPC 头顶浮动气泡显示思考状态：
      - **空闲**：无气泡
      - **请求中**：「思考中...」带动画点
      - **已收到**：LLM 响应中的「{reasoning}」文字
      - **执行中**：动作图标 + 文字（挖掘/建造/移动/说话）
    - 用 CSS2DRenderer 的 HTML 叠层渲染（与 T6 名牌相同）
    - 3 秒后自动隐藏
    - 流式文字：LLM 流式输出时推理内容实时更新
    - 范围内所有玩家可见

  **禁止事项**：

  - 不做复杂动画、气泡不可交互

  **推荐智能体配置**：

  - **类别**： `visual-engineering`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T20-T23)
  - **并行组**： Wave 4
  - **阻塞**： T24
  - **被阻塞于**： T10, T12

  **参考**：

  - `src/core/npc/` — NPC entity with name tag overlay (T6) — bubbles extend same approach
  - Three.js CSS2DRenderer: `https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer`

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：LLM 请求期间出现思考气泡
    工具：Playwright（playwright skill）
    步骤：
      1. 等待 NPC 下一次决策周期
      2. 在「请求中」阶段截图
      3. 在「已收到」阶段截图
    预期结果：气泡依次为「思考中...」→「{reasoning}」→ 动作文字
    证据：.sisyphus/evidence/task-19-thinking-bubble.png
  ```

  **提交**：是

  - 提交信息： `feat(ui): implement NPC thinking bubbles`
  - 涉及文件： `src/core/npc/thinking-bubble/**`

---

- [x] 20. 思考可视化 — 侧边栏日志面板

  **做什么**：

  - 在 `src/ui/sidebar-log/` 中实现：
    - 右侧边栏面板显示 AI 决策时间线（仅 PC）
    - 可滚动的 NPC 决策事件列表
    - 每条：NPC 颜色点 + 名字 + 时间戳 + 状态
    - 可展开：点击查看推理与原始响应
    - NPC 做出决策时实时更新
    - 筛选：仅显示选中 NPC 或全部
    - 颜色：黄=请求中、绿=成功、蓝=执行中、红=错误
    - 每次请求的 token 数与响应时间
    - 最小化/最大化切换按钮
  - 监听模拟的思考状态事件

  **禁止事项**：

  - 不做导出/下载、高级搜索

  **推荐智能体配置**：

  - **类别**： `visual-engineering`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T19, T21-T23)
  - **并行组**： Wave 4
  - **阻塞**： T24
  - **被阻塞于**： T10

  **参考**：

  - `src/ui/index.ts` — Existing UI module structure for registration pattern
  - `src/ui/fps/` — Simple UI overlay pattern

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：侧边栏显示 NPC 决策事件
    工具：Playwright（playwright skill）
    步骤：
      1. 确认侧边栏在屏幕右侧可见
      2. 等待 15 秒以产生 NPC 决策
      3. 对含条目的侧边栏截图
      4. 点击一条以展开
    预期结果：多条带颜色状态；展开后显示推理
    证据：.sisyphus/evidence/task-20-sidebar.png

  场景：筛选仅显示选中 NPC
    工具：Playwright（playwright skill）
    步骤：
      1. 点击筛选，选择 "Wrench"
    预期结果：仅显示 Wrench 的条目
    证据：.sisyphus/evidence/task-20-filter.png
  ```

  **提交**：是

  - 提交信息： `feat(ui): implement AI sidebar log panel`
  - 涉及文件： `src/ui/sidebar-log/**`

---

- [x] 21. NPC 任务列表 UI（附身时可见）

  **做什么**：

  - 在 `src/ui/task-list/` 中实现：
    - 左侧面板仅在附身 NPC 时显示（T14）
    - 显示 NPC 来自 LLM `nextGoal` 响应的当前目标
    - 展示：带状态图标（待办/进行中/完成）的有序列表
    - NPC AI 更新目标时自动刷新
    - 玩家只读
    - 附身时出现，释放时隐藏

  **禁止事项**：

  - 玩家不可分配任务、不做任务共享

  **推荐智能体配置**：

  - **类别**： `visual-engineering`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T19, T20, T22, T23)
  - **并行组**： Wave 4
  - **阻塞**： T24
  - **被阻塞于**： T12, T14

  **参考**：

  - `src/controller/possession/` — Possession state for show/hide logic (T14)

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：附身 NPC 时出现任务列表
    工具：Playwright（playwright skill）
    步骤：
      1. 用 Tab 附身 NPC
      2. 确认左侧任务列表面板
    预期结果：带状态指示的有序任务列表可见
    证据：.sisyphus/evidence/task-21-task-list.png

  场景：释放后任务列表隐藏
    工具：Playwright（playwright skill）
    步骤：
      1. 用 Tab 释放 NPC
    预期结果：任务列表面板消失
    证据：.sisyphus/evidence/task-21-hide.png
  ```

  **提交**：是

  - 提交信息： `feat(ui): implement NPC task list panel`
  - 涉及文件： `src/ui/task-list/**`

---

- [x] 22. HUD 完善（HP/饥饿条，模式指示器）

  **做什么**：

  - 在 `src/ui/survival-hud/` 中实现：
    - HP 条：左下红色横条
    - 饥饿条：HP 下方橙色条
    - 模式指示：顶部居中显示「普通」/「观察者模式」/「附身：{NPC 名}」
    - 玩家/NPC 数量：角落显示「10 个 NPC 活跃」
  - 仅在赛博朋克场景中显示（不影响其他场景）
  - 仅 PC
  - 监听模拟生存事件以更新 HP/饥饿
  - 与现有 HUD-stage div 集成

  **禁止事项**：

  - 不改设置菜单、不做按键自定义

  **推荐智能体配置**：

  - **类别**： `visual-engineering`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T19-T21, T23)
  - **并行组**： Wave 4
  - **阻塞**： T24
  - **被阻塞于**： T8

  **参考**：

  - `src/ui/crosshair/` — Existing HUD overlay pattern (simple DOM elements on HUD-stage)
  - `src/controller/index.ts:41-47` — `hudStage` div creation and management

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：游戏过程中 HUD 元素可见
    工具：Playwright（playwright skill）
    步骤：
      1. 开始赛博朋克场景游戏
      2. 确认 HP 条（选择器：`.survival-hud .hp-bar`）
      3. 确认饥饿条（选择器：`.survival-hud .hunger-bar`）
      4. 确认模式指示器可见
    预期结果：所有 HUD 元素已渲染且不与现有 UI 重叠
    证据：.sisyphus/evidence/task-22-hud.png
  ```

  **提交**：是

  - 提交信息： `feat(ui): implement survival HUD with HP/hunger bars`
  - 涉及文件： `src/ui/survival-hud/**`

---

- [x] 23. 世界持久化（客户端保存/加载）

  **做什么**：

  - Implement in `src/simulation/persistence/`:
    - 客户端每 60 秒自动保存世界状态（单机）
    - 保存数据：方块改动差异、NPC 状态、玩家生存状态、掉落物、怪物位置
    - 存储：localStorage 或 IndexedDB（推荐 IndexedDB）
    - 进入游戏时自动尝试恢复最近一次存档
    - 页面关闭/刷新前触发一次即时保存

  **禁止事项**：

  - 不引入后端数据库、不做版本化存档
  - 不实现联机房间级持久化

  **推荐智能体配置**：

  - **类别**： `deep`
    - 原因： Data serialization, browser storage lifecycle, state merge
  - **技能**： []

  **并行化**：

  - **可并行执行**：是 (with T19-T22)
  - **并行组**： Wave 4
  - **阻塞**： T24, T27
  - **被阻塞于**： T4, T18

  **参考**：

  - `src/controller/index.ts` — 单机启动/退出流程接入点
  - `src/controller/config/` — 本地配置与存档键命名约定

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：刷新页面后世界状态保持
    工具：Bash
    步骤：
      1. 启动游戏并修改世界（放置方块）
      2. 刷新页面 / 重新打开浏览器标签
      3. 加载存档并查询方块
    预期结果：刷新/重开后方块仍存在
    证据：.sisyphus/evidence/task-23-persistence.txt

  场景：NPC 状态保持
    工具：Bash
    步骤：
      1. NPC 从出生点移动并获取物品
      2. 刷新/重开页面
      3. 查询 NPC 位置与背包
    预期结果：NPC 状态与刷新前一致
    证据：.sisyphus/evidence/task-23-npc-persistence.txt
  ```

  **提交**：是

  - 提交信息： `feat(persistence): implement client-side world save/load`
  - 涉及文件： `src/simulation/persistence/**`

---

- [x] 24. 完整集成：所有系统协同工作

  **做什么**：

  - 将所有系统串联为完整玩法：
    - 确认 NPC AI 驱动 NPC 与真实体素世界交互
    - 确认附身正确转移控制并暂停 AI
    - 确认观察者模式展示所有 NPC 活动
    - 确认生存 tick 同时影响玩家与 NPC
    - 确认怪物与玩家、NPC 均可交互
    - 确认附身与自主 NPC 的死亡/复活正常
    - 确认思考气泡与侧边栏日志显示真实 LLM 数据
    - 确认单机稳定性：连续游玩状态一致
    - 确认持久化：刷新/重开页面后状态保留
    - 确认现有 ThreeCraft 功能：Classic/Ice/Beach/Melon/Pumpkin 场景仍可用
  - 修复测试中发现的集成问题
  - 建立游戏启动流程：选择赛博朋克场景 → 世界加载 → NPC 生成 → 玩家可探索/附身

  **禁止事项**：

  - 不增加新功能、不做性能优化（留待 T26）

  **推荐智能体配置**：

  - **类别**： `deep`
  - **技能**： [`playwright`]

  **并行化**：

  - **可并行执行**：否 (must verify all systems together)
  - **并行组**： Wave 5 (sequential before T25-T27)
  - **阻塞**： T25, T26, T27
  - **被阻塞于**： T11, T13, T14, T15, T16, T17, T19, T20, T21, T22, T23

  **参考**：

  - All previous task outputs and file paths

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：赛博朋克场景完整游戏循环
    工具：Playwright（playwright skill）
    步骤：
      1. 打开 http://localhost:5173
      2. 以赛博朋克场景开始单机
      3. 看到 10 个带名牌的 NPC
      4. 走近 NPC，观察思考气泡
      5. 按 Tab 附身 NPC
      6. 挖掘一个方块、放置一个方块
      7. 按 Tab 释放
      8. 按 G 进入观察者模式
      9. 在观察者模式中点击 NPC 查看信息面板
    预期结果：所有步骤端到端成功
    证据：.sisyphus/evidence/task-24-integration.png

  场景：向后兼容 — Classic 场景正常
    工具：Playwright（playwright skill）
    步骤：
      1. 开始单机游戏（非赛博朋克场景）
      2. 移动、放置/破坏方块
    预期结果：Classic 场景与之前完全一致
    证据：.sisyphus/evidence/task-24-backward-compat.png

  场景：单机会话稳定性
    工具：Playwright（playwright skill）
    步骤：
      1. 连续游玩 10 分钟（移动、挖掘、建造、附身切换）
      2. 观察 NPC 决策、HUD、对话日志持续更新
      3. 记录是否出现卡死、状态错乱或 UI 崩溃
    预期结果：会话稳定，无阻塞性错误
    证据：.sisyphus/evidence/task-24-single-stability.png
  ```

  **提交**：是

  - 提交信息： `feat(integration): wire all systems together`
  - 涉及文件： Various integration code

---

- [x] 25. 单机稳定性验证（长时运行）

  **做什么**：

  - 在单标签页连续运行 20 分钟赛博朋克场景
  - 验证 NPC 行为、方块交互、附身切换、HUD 更新持续稳定
  - 测试刷新重进：状态恢复正确
  - 测试异常网络下 LLM 调用失败降级行为
  - 记录平均帧率与关键交互响应时延

  **禁止事项**：

  - No automated load testing framework

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： [`playwright`]

  **并行化**：

  - **可并行执行**：是 (with T26, T27)
  - **并行组**： Wave 5
  - **阻塞**： F1-F4
  - **被阻塞于**： T18, T24

  **参考**：

  - `src/controller/index.ts` — 单机主循环
  - `src/simulation/events/` — 客户端事件总线
  - `src/simulation/persistence/` — 本地持久化模块

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：20 分钟单机浸泡测试
    工具：Playwright（playwright skill）
    步骤：
      1. 启动单机赛博朋克游戏
      2. 运行 20 分钟并周期性进行移动/战斗/建造/附身
      3. 采集错误日志与帧指标
    预期结果：无严重错误，玩法保持流畅
    证据：.sisyphus/evidence/task-25-soak-test.txt

  场景：刷新后恢复保持正确状态
    工具：Playwright（playwright skill）
    步骤：
      1. 游玩 2–3 分钟并改变世界/NPC 状态
      2. 刷新页面并重新加载存档
      3. 确认 NPC 位置、背包、方块与刷新前一致
    预期结果：状态恢复正确且无明显丢失
    证据：.sisyphus/evidence/task-25-refresh-resume.png
  ```

  **提交**：是

  - 提交信息： `test(single-player): verify long-run stability and resume flow`
  - 涉及文件： single-player validation scripts/evidence notes

---

- [x] 26. 性能优化

  **做什么**：

  - NPC 休眠/唤醒：确认兴趣范围外的 NPC 停止 LLM 调用
  - 对象池：复用 Three.js 几何体做 NPC/怪物渲染
  - NPC 更新批处理：每 tick 批量更新 NPC 状态
  - 渲染距离：确保 NPC 实体遵循渲染距离裁剪
  - 在 10 个 NPC + 怪物 + 地形下做 FPS 分析
  - 目标：中端设备 30+ FPS

  **禁止事项**：

  - 不用 WebGPU、不做服务端多线程

  **推荐智能体配置**：

  - **类别**： `deep`
  - **技能**： [`playwright`]

  **并行化**：

  - **可并行执行**：是 (with T25, T27)
  - **并行组**： Wave 5
  - **阻塞**： F1-F4
  - **被阻塞于**： T24

  **参考**：

  - `src/controller/MultiPlay/players.ts:19-23` — （历史参考）基于渲染距离的可见性裁剪模式，可用于单机 NPC/怪物裁剪

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：满负载下 30+ FPS
    工具：Playwright（playwright skill）
    步骤：
      1. 以 10 个 NPC 启动赛博朋克场景
      2. 用 performance API 测量 30 秒内 FPS
    预期结果：平均 FPS ≥ 30
    证据：.sisyphus/evidence/task-26-fps.txt

  场景：NPC 休眠降低资源占用
    工具：Bash
    步骤：
      1. 将所有观察者移离 NPC
      2. 统计 30 秒内 LLM 调用次数
    预期结果：休眠时 LLM 调用接近零
    证据：.sisyphus/evidence/task-26-sleep.txt
  ```

  **提交**：是

  - 提交信息： `perf: optimize NPC sleep mode and rendering`
  - 涉及文件： Various performance files

---

- [x] 27. 游戏启动流程（出生点，NPC 放置，复活泉）

  **做什么**：

  - 在 `src/simulation/game-start/` 中做赛博朋克专用游戏初始化：
    - 赛博朋克场景加载时：在原点周围预定位置（聚居布局）生成 10 个 NPC
    - 在 (0, surface_y, 0) 用醒目发光方块放置复活泉结构
    - 每个 NPC 以符合职业的初始背包开始
    - 启动模拟引擎（无 API 密钥用桩大脑，有则用 GLM-5）
    - 显示赛博朋克新功能简短说明叠层（Tab=附身，G=观察者，E=对话）
  - 单机：全部在客户端运行

  **禁止事项**：

  - 不做角色创建、服务器浏览器、教程

  **推荐智能体配置**：

  - **类别**： `unspecified-high`
  - **技能**： [`frontend-ui-ux`]

  **并行化**：

  - **可并行执行**：是 (with T25, T26)
  - **并行组**： Wave 5
  - **阻塞**： F1-F4
  - **被阻塞于**： T23, T24

  **参考**：

  - `src/controller/index.ts:80-105` — `startGame` 流程中挂接赛博朋克初始化
  - `src/core/weather/index.ts` — 天气检测以触发赛博朋克专用逻辑
  - `src/simulation/personas/` — NPC 人设定义，用于初始背包

  **验收标准**：

  **QA 场景（必选）**：

  ```
  场景：赛博朋克游戏随 NPC 启动
    工具：Playwright（playwright skill）
    步骤：
      1. 启动赛博朋克场景
      2. 确认原点附近生成 10 个 NPC
      3. 确认说明叠层
    预期结果：NPC 可见、说明已显示
    证据：.sisyphus/evidence/task-27-start-flow.png

  场景：原点处存在复活泉
    工具：Playwright（playwright skill）
    步骤：
      1. 看向世界原点区域
    预期结果：可见醒目的发光方块结构
    证据：.sisyphus/evidence/task-27-revival-spring.png
  ```

  **提交**：是

  - 提交信息： `feat(game): implement cyberpunk game start flow`
  - 涉及文件： `src/simulation/game-start/**`

---

## 最终验证波次（强制 — 所有实现任务完成后）

> 4 个审查智能体并行运行。全部必须通过。拒绝 → 修复 → 重新运行。

- [x] F1. **计划合规审计** — `oracle`
      通读整个计划。对于每项"必须具备"：验证实现存在（读取文件、运行命令）。对于每项"禁止事项"：搜索代码库中的禁止模式 — 发现则用 file:line 拒绝。检查 `.sisyphus/evidence/` 中的证据文件是否存在。对照计划检查交付物。验证现有 ThreeCraft 功能仍正常工作（运行 `pnpm dev`，加载 Classic 场景，四处移动，放置方块）。
      输出：`必须具备 [N/N] | 禁止项 [N/N] | 任务 [N/N] | 向后兼容 [通过/失败] | 结论：通过/拒绝`

- [x] F2. **代码质量审查** — `unspecified-high`
      对客户端运行 `pnpm exec tsc --noEmit`。审查所有新增/修改文件：`as any`/`@ts-ignore`、空 catch、生产代码中的 console.log、注释掉的代码、未使用的导入。检查模块化代码强制规则：无文件超过 200 LOC（非 prompt），无 `utils.ts` 大杂烩，`index.ts` 仅作入口点。检查 AI 产物：过多注释、过度抽象、通用变量名。
      输出：`构建 [通过/失败] | 文件 [N 通过/N 问题] | LOC 规则 [通过/失败] | 结论`

- [x] F3. **真实手动 QA** — `unspecified-high`（+ `playwright` skill）
      从干净状态开始。执行每个任务的每个 QA 场景 — 按确切步骤执行，收集证据。测试跨任务集成（NPC AI + 附身 + 生存 + 单机持久化）。测试边界情况：空背包死亡、同时尝试附身、快速方块编辑、NPC 路径失效。测试向后兼容性：加载 Classic 场景，正常游玩。保存到 `.sisyphus/evidence/final-qa/`。
      输出：`场景 [N/N 通过] | 集成 [N/N] | 边界用例 [N 已测] | 向后兼容 [通过/失败] | 结论`

- [x] F4. **范围一致性检查** — `deep`
      对于每个任务：读取"做什么"，读取实际实现。验证 1:1 匹配。检查所有任务的"禁止事项"合规性。检测范围蔓延：是否有计划外的功能？标记未说明的文件。验证没有现有 ThreeCraft 文件被修改，除非任务中明确列出。
      输出：`任务 [N/N 合规] | 范围蔓延 [无/N 项问题] | 未说明 [无/N 个文件] | 结论`

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

- [x] 所有"必须具备"项已实现
- [x] 所有"禁止事项"项已排除
- [x] 现有 ThreeCraft 功能未破坏（向后兼容）
- [ ] 赛博朋克场景在单机模式下稳定工作
- [x] 10 个 NPC 用 GLM-5 自主运行（或测试模式下使用桩大脑）
