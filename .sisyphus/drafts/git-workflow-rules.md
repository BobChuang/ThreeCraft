# Draft: Git Workflow Rules

## Requirements (confirmed)

- 每完成一个任务都需要执行 Git 提交并推送（commit + push）。
- push 到当前工作分支。
- 若 push 失败：允许仅本地 commit 完成，不阻塞下一个任务。
- 该规则不仅用于新计划，也需要回填到已有计划文件。

## Technical Decisions

- 确认：每个任务严格 1 个 commit，任务完成后立即 push。

## Research Findings

- 无（当前为流程规则变更，不涉及技术调研）。

## Open Questions

- 无（范围与执行策略已确认）。

## Applied Updates

- 已回填：`.sisyphus/plans/cybervoxel-mvp.md`
  - 在 `## 待办任务` 下新增「Git 提交/推送统一规则（适用于本计划所有任务）」
  - 规则内容：每任务 1 commit + 立即 push；push 到当前分支；push 失败可不阻塞但需在最终验证前补齐并留痕。
- 已新增计划模板级规则：`.sisyphus/rules/plan-task-commit-push.md`
  - 作用范围：`.sisyphus/plans/*.md`（alwaysApply: true）
  - 用于后续新计划自动套用相同 Git 约束。

## Additional Plan Scope Change (confirmed)

- 用户要求将当前计划从“单人+联机”收敛为“仅单人模式”。
- 已更新 `.sisyphus/plans/cybervoxel-mvp.md`：
  - 核心范围改为仅客户端单机模拟。
  - 原联机同步/服务端持久化相关任务改为单机事件总线与客户端持久化。
  - 验证与成功标准改为单机场景稳定性与刷新恢复。
  - 已做一致性巡检：将残留“联机实现导向”表述改为“历史参考/不在本计划范围”。

## New Requirement Added (confirmed)

- 在 `.env.development` 和 `.env.production` 增加地图强制参数。
- 参数确认：`VITE_FIXED_MAP_INDEX`（索引方式）。
- 行为确认：
  - 空/未设置 → 随机地图（默认行为）
  - 设置合法索引 → 强制进入指定地图
  - 非法值 → 安全降级到随机地图
- 该参数作为“赛博朋克地图开发调试入口”。

## Plan File Update Applied

- 已在 `.sisyphus/plans/cybervoxel-mvp.md` 新增 Task #1（固定地图索引环境变量）。
- 原任务全量顺延：`#1..#26` → `#2..#27`，并同步顺延：
  - T 编号引用（关键路径/波次/依赖矩阵/并行阻塞）
  - 提交策略表
  - QA 证据编号（`task-N-*`）
- 在“赛博朋克地图任务（现 Task #2）”补充了使用 `VITE_FIXED_MAP_INDEX` 进行调试的说明。

## Scope Boundaries

- INCLUDE: 将“每任务完成后 commit + push”写入后续工作计划规则。
- INCLUDE: 回填更新 `.sisyphus/plans/` 下既有计划中的任务提交规则。
- EXCLUDE: 当前不执行代码实现，仅更新规划规则与执行约束。
