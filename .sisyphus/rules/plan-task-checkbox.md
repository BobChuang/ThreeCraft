---
globs: ['.sisyphus/plans/*.md']
alwaysApply: true
description: 'After completing a plan task, mark its checkbox as done in the plan file'
---

# 计划任务完成后：标记 Checkbox（强制）

适用范围：所有 `.sisyphus/plans/*.md` 计划文件中的任务。

## 强制要求

1. 每个任务完成并 commit 后，**必须立即**将该任务在计划文件中的 checkbox 从 `- [ ]` 改为 `- [x]`。
2. 标记范围：仅改动任务标题行的 checkbox，**不修改**任务详情内容。
3. 该标记操作应包含在任务的同一次 commit 中，或紧随其后的独立 commit 中。
4. 子智能体（subagent）完成任务后，若无法直接修改计划文件，须在返回结果中明确提示主智能体执行标记。

## 示例

完成前：

```markdown
- [ ] 17. 死亡和重生系统
```

完成后：

```markdown
- [x] 17. 死亡和重生系统
```

## 为什么

- 让计划文件实时反映项目进度
- 任何人（人类或智能体）打开计划文件即可看到当前状态
- 避免重复执行已完成的任务
