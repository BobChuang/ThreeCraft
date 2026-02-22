# Issues

## 2026-02-21 Task 1

- `pnpm exec tsc --noEmit` currently fails with a large set of pre-existing repository-wide TypeScript errors unrelated to this task (strict null checks/implicit any/etc. across many files).
- This task-level change is verified via Playwright scenarios and targeted runtime checks, but global typecheck remains blocked by baseline project state.

## 2026-02-21 Task 2

- `pnpm exec tsc --noEmit` still fails with pre-existing repository baseline TypeScript errors (captured in `.sisyphus/evidence/task-2-tsc.txt`); Task 2 validation relied on successful `pnpm build`, clean LSP diagnostics for changed files, targeted evidence checks, and runtime screenshot proof.

## 2026-02-21 Task 7

- `pnpm exec tsc --noEmit` continues to fail due to pre-existing repo-wide baseline TypeScript errors unrelated to the inventory scope; Task 7 validation used targeted inventory QA scenarios, clean LSP diagnostics on changed files, and successful `pnpm build`.

## 2026-02-21 Task 9

- Running ad-hoc `pnpm exec tsc` for temporary QA compilation hit a baseline `AbortSignal` DOM/Node lib conflict; adding `--skipLibCheck true` for the isolated mock-compile path was required for deterministic evidence scripting.
- Client bridge LLM calls intentionally fall back to stub idle output when no client API key is present, so simulation ticks remain non-blocking in existing default local runs.

## 2026-02-21 Task 10

- Deterministic evidence scripts for Task 10 also require isolated TypeScript compilation with `--skipLibCheck true` to avoid unrelated baseline typing conflicts during temporary CommonJS QA builds.

## 2026-02-21 Task 8

- Deterministic Task 8 evidence execution also uses isolated simulation compilation (`pnpm exec tsc ... --skipLibCheck true --outDir .sisyphus/tmp/task8-sim`) to avoid unrelated repository-wide typing noise during Node-based QA scripts.

## 2026-02-21 Task 11

- Task 11 deterministic evidence also requires isolated simulation compilation with `--skipLibCheck true` (`.sisyphus/tmp/task11-sim`) to avoid pre-existing repository-wide TypeScript baseline noise.

## 2026-02-21 Task 13

- Task 13 deterministic evidence similarly uses isolated TypeScript compilation to `.sisyphus/tmp/task13-validation` with `--skipLibCheck true` so evidence generation is not blocked by unrelated repository-wide typing baseline errors.

## 2026-02-21 Task 14

- During automated browser verification, one early multi-step Playwright interaction crashed the page; using a single consolidated `browser_run_code` scenario produced stable deterministic possession/pause/release evidence.
- Dev runtime still emits a known baseline `registerSW.js` 404 console error in local Vite runs; it is unrelated to possession behavior and does not block Task 14 acceptance flows.

## 2026-02-21 Task 11 Follow-up

- Isolated Task 11 evidence compilation still surfaces pre-existing `NPCActionValidationResult` narrowing errors in `src/simulation/npc-ai/decision-loop.ts`; behavior executor verification remains covered by deterministic gather/build Node scripts and successful `pnpm build`.

## 2026-02-21 Task 15

- In automated Playwright runs, synthetic key events did not always toggle observer mode reliably in this project’s pointer-lock gameplay flow; evidence capture depended on stabilized interaction timing and direct in-page event dispatch.

## 2026-02-21 Task 16

- Deterministic evidence generation through a temporary simulation compile still encounters pre-existing `NPCActionValidationResult` narrowing errors in `src/simulation/npc-ai/decision-loop.ts`; task evidence was produced via isolated monster-manager compilation path to avoid unrelated baseline typing noise.

## 2026-02-21 Task 12

- Playwright MCP had intermittent `Target crashed` failures during longer wait-heavy browser runs; a shorter deterministic interaction sequence (direct controller-driven positioning + dialogue trigger + immediate screenshot) was required for stable evidence capture.
- Local Vite runtime still reports the known `registerSW.js` 404 console error during QA runs; this baseline warning is unrelated to Task 12 dialogue functionality.

## 2026-02-21 Task 17

- Local dev runtime still emits the known baseline `registerSW.js` 404 error while validating death overlay flows in Playwright; it remains non-blocking and unrelated to Task 17 logic.

## 2026-02-21 Task 17 Retry (player death drop gap)

- In respawn-at-origin flows, if death occurs very close to respawn position, the player can quickly re-collect their own drop after revival due to shared pickup rules; this is expected under current acceptance scope and does not block death-drop emission correctness.

## 2026-02-21 Task 18

- `pnpm build` still reports the known baseline Vite warning about `<script src="/registerSW.js">` lacking `type="module"`; it is pre-existing and non-blocking for event-bus functionality.

## 2026-02-21 Task 18 Manual QA

- Playwright screenshot capture remains unstable in this WebGL runtime (`page.screenshot` timeout/target crash in longer sessions); deterministic QA evidence is more stable through runtime assertions + console scan + textual logs.

## 2026-02-22 Task 19

- Local Vite run still emits the known baseline `registerSW.js` console 404 warning during Playwright capture; it is unrelated to thinking-bubble functionality and non-blocking for acceptance.

## 2026-02-22 Task 20

- 本地自动化截图中默认 headless Chromium 可能触发 `Error creating WebGL context`，导致侧边栏面板不可见；切换到软件渲染参数后恢复稳定。
- 开发运行期间仍存在基线 `registerSW.js` 404 / 非 module 警告，为仓库既有问题，未阻塞 Task 20 的 UI 功能与证据产出。

## 2026-02-22 Task 21

- 首次实现中误用了 `String.replaceAll(RegExp)`（非全局正则）导致运行时报错，已改为 `replace(/.../g, ...)` 以兼容当前运行环境。
- Playwright 验证期间继续出现仓库基线 `registerSW.js` 404 控制台错误，不影响附身态任务列表显示/隐藏验收。

## 2026-02-22 Task 22

- 本地 HUD 运行与截图验证期间继续出现仓库基线 `registerSW.js` 404 / 非 module 提示，不影响 Task 22 功能与构建通过。
- 默认随机地图下 HUD 可能因非赛博朋克场景按预期隐藏；为稳定采集证据，使用 `VITE_FIXED_MAP_INDEX=12` 启动临时开发服务锁定赛博朋克场景。

## 2026-02-22 Task 22 主代理独立复核

- 通过 Playwright 在 `VITE_FIXED_MAP_INDEX=12` + PC 模式下进入单机，确认 HUD 可见并包含：`HP` 条、`HUNGER` 条、模式文案（`普通`）、`10 个 NPC 活跃` 文本；证据截图：`.sisyphus/evidence/task-22-hud-orchestrator.png`。
- 控制台仅见已知基线 `registerSW.js` 404 报错，本次复核未发现阻塞 HUD 验收的新问题。

## 2026-02-22 Task 23

- 本地 Playwright 长时间等待与多次 reload 组合场景偶发 `Target crashed/timeout`；将 60s 自动保存验证拆成独立步骤（先读时间戳、再 `wait_for`、再读取）可稳定复现。
- 开发环境仍持续出现基线 `registerSW.js` 404 错误，与本任务持久化逻辑无关且不阻塞验收。

## 2026-02-22 Task 23 主代理独立 QA

- 主代理复核中，Playwright 在长等待（60s+）后偶发 `Target crashed`，但通过“分步读取 `savedAt` + 会话内再次采样”仍可稳定拿到自动保存时间戳递增证据。
- 控制台错误仅见仓库基线 `registerSW.js` 404；未发现阻塞世界持久化验收的新运行时错误。

## 2026-02-22 Task 24 Orchestrator QA

- Playwright MCP 在 WebGL 长会话中仍偶发 `Target crashed`；重开 tab 后可恢复并继续验证，不影响本次功能结论。
- 本次图像解析工具对部分现有 PNG 证据返回不稳定（同文件多次结果不一致/不可读），因此最终一致性判断以实时交互验证 + 文件存在性/尺寸校验为主。

## 2026-02-22 Task 25

- Playwright MCP 在该 WebGL 场景下执行超长 `wait`/会话时仍可能出现 `Target crashed` 或 snapshot timeout；本任务改用短周期分段验证以规避自动化层不稳定。
- 运行期继续观测到仓库基线 `registerSW.js` 404 / 非 module 错误，为既有问题，未阻塞单机稳定性与刷新恢复验收结论。
- 当前运行环境中 `simulationEngine.client.callLLM` 直连 hook 不可用，LLM 失败降级验证采用“运行连续性（NPC/HUD/FPS）不被阻塞”的能力内检查路径。

## 2026-02-22 Task 26

- 本地 QA 启动 `pnpm dev --port 4173` 时端口连续被占用，Vite 自动回退到 `4180`；证据采集已使用实际端口并记录在 task-26 证据文件。
- 运行期仍可见仓库基线 `registerSW.js` 404/非 module 噪声，不影响本次性能优化验收结论。

## 2026-02-22 Task 26 补充

- Playwright WebGL 长会话会累计大量控制台错误噪声；本任务证据以短窗口 FPS 采样与文本结果为主，避免被自动化会话抖动干扰。

## 2026-02-22 Task 27

- 本地 `pnpm dev --port 4173` 端口被占用后自动回退到 `4174`，本次证据采集已按实际端口执行。
- 开发运行期继续出现仓库既有 `registerSW.js` 404 基线 warning；未发现阻塞 T27 验收的新构建错误。
- Playwright 中若动态导入 `'/src/index.ts'` 会触发重复控制器实例并刷出大量 `TypeError: undefined is not iterable` 控制台错误；已改为短链路直接进入单机截图规避。

## 2026-02-23 Task 27（本次验收）

- 本次 `pnpm dev --host 127.0.0.1 --port 4173` 启动时端口连续占用，Vite 自动漂移到 `4177`；证据与日志已按实际端口执行。
- Playwright 会话仍出现仓库既有 `registerSW.js` 404 控制台噪声，为基线问题，未阻塞 T27 启动流验收。

## 2026-02-23 F1（计划合规审计）

- Playwright MCP 初次导航曾出现 `Target crashed`；执行一次 `browser_close` 后重新打开页面可恢复稳定。
- F1 复核中持续出现仓库既有基线噪声（`registerSW.js` 404、构建阶段非 module 提示），未观察到新增阻塞错误。

## 2026-02-23 F2（代码质量审查）

- `pnpm exec tsc --noEmit` 仍失败（`TSC_EXIT=2`），错误主要位于历史文件（如 `src/controller/**`、`src/core/**`、`src/ui/**` 旧代码）与类型基线（`AbortSignal` 声明冲突），非本次审查新增。
- 本次审查范围内源码文件未发现 `as any`、`@ts-ignore`、空 catch、生产 `console.log`、注释掉代码、LOC 超限等新增问题，但由于全仓 tsc 门禁失败，F2 结论为不通过。

## 2026-02-23 Task 18（closure refresh）

- `pnpm build` 仍出现仓库既有 warning：`<script src="/registerSW.js"> ... can't be bundled without type="module"`；本次仅做 T18 复核与证据刷新，未引入新的阻塞构建错误。

## 2026-02-23 Task 19（thinking bubble refresh）

- Playwright 在一次较长 `browser_run_code + page.evaluate(async import)` 场景中出现 `Target crashed`；恢复手段为 `browser_close` 后重开页面并改用短路径采样（DOM 过滤 + 短轮询）。
- QA 期间持续出现仓库基线 `registerSW.js` 404 控制台错误，已记录为非阻塞噪声，未影响 T19 功能验证与截图证据。

## 2026-02-23 Task 20（sidebar log refresh）

- `pnpm dev --host 127.0.0.1 --port 4173` 启动时端口连续占用并自动回退至 `4181`；证据采集已按实际端口执行。
- Playwright 交互中 `.sidebar-expand` 点击会被 `#controller` 覆层拦截（pointer events）；通过 DOM 内触发 click 可稳定完成详情展开验证。
- 运行期仍存在仓库基线 `registerSW.js` 404 与构建时非 module warning，均为非阻塞噪声，未影响 T20 验收。

## 2026-02-23 Task 21（closure refresh）

- 本次请求端口为 `4173`，开发服务实际漂移到 `4181`；证据采集全程基于实际端口执行。
- Playwright 运行期间持续出现仓库既有 `registerSW.js` 404 控制台错误，属于非阻塞基线噪声，不影响附身态任务列表显隐验收。

## 2026-02-23 Task 22（closure refresh）

- 本次请求端口为 `4173`，开发服务实际漂移到 `4182`（`task-22-dev-reverify.log` 已记录连续占用与回退链路）。
- Playwright 验证期间继续出现仓库基线 `registerSW.js` 404；同时观察到一次运行时 `TypeError: Cannot read properties of null (reading 'add')`（`BlockAction.placeBlock`，由赛博朋克开局 spring block 注入触发），本次按 Task22 最小改动策略未扩大修复范围，仅如实记录。
- `pnpm build` 通过，但仍有既有 non-module warning：`<script src="/registerSW.js"> ... can't be bundled without type="module"`。

## 2026-02-23 Task 23（closure refresh）

- 本次请求端口 `4173` 被占用并自动漂移至 `4183`；证据文件已按实际端口执行与记录。
- Playwright 长等待（单次 >60s）在该环境易超时；改为分段短流程与独立采样后可稳定完成 autosave 与 reload/reopen 证据。
- 控制台继续出现仓库基线 `registerSW.js` 404（`http://127.0.0.1:4183/registerSW.js`），未阻塞 Task23 收口验收。
