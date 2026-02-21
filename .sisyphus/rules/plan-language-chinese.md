---
globs: ['.sisyphus/plans/*.md']
alwaysApply: true
description: 'Plans must be written in Chinese, with English only for technical terms'
---

# 计划语言：中文优先（强制）

适用范围：所有 `.sisyphus/plans/*.md` 计划文件的编写与更新。

## 强制要求

1. 计划正文**必须使用中文**撰写，包括：任务描述、做什么、禁止事项、QA 场景、验收标准、背景说明、访谈摘要等所有章节。
2. **允许使用英文**的情况仅限：
   - 代码标识符（变量名、函数名、类名、文件路径、模块名）
   - 技术专有名词（如 A\*、LLM、API、SSE、JSON Schema、IndexedDB、WebSocket、Three.js）
   - 工具/框架/库名称（如 Playwright、Vite、GLM-5、Socket.io）
   - Git commit message（保持英文 conventional commit 格式）
   - 代码块内容
   - 智能体类别名（如 `quick`、`deep`、`visual-engineering`）
3. 表格表头、列表标签、章节标题均使用中文。
4. 若引用英文技术名词，无需额外翻译或加注。
