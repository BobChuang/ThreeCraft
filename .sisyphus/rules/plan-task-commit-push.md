---
globs: ['.sisyphus/plans/*.md']
alwaysApply: true
description: 'Plan template policy: each task requires exactly one commit and immediate push'
---

# 计划模板规则：任务级 Git 提交与推送（强制）

适用范围：所有新建或更新的 `.sisyphus/plans/*.md` 计划文件。

## 强制要求

1. 每个任务完成后必须执行：**恰好 1 个 commit + 立即 push**。
2. push 目标：**当前工作分支**。
3. 若 push 失败（网络/权限/冲突等）：
   - 允许先以本地 commit 继续后续任务；
   - 但必须在“Final Verification Wave”之前补齐 push；
   - 需在计划执行记录/证据中写明失败原因与补推结果。
4. 任务 `Commit` 小节与本规则冲突时，以本规则为准。

## 计划编写要求（Prometheus）

- 在计划的 `## TODOs` 前，加入“Git 提交/推送统一规则（适用于本计划所有任务）”小节。
- 每个任务的 `Commit` 字段默认写为 `YES`，并提供该任务唯一 commit message 模板。
- 在最终验证波次中加入检查项：确认所有任务均已满足“1 任务 = 1 commit，且已 push（或有补推记录）”。
