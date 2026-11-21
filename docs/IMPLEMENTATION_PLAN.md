# 分步实施计划

## 审批与交付规则

每个大步骤开始前都单独说明变更和预期收益，经用户批准后执行。每一步都包含备份、真实验证和本地 Git 提交；失败时不进入下一步，不通过静默缩小目标来宣称完成。

统一约束：

- 所有模型测试只走 `google-vertex` Gemini 4。
- 长跑采用宿主机权限边界 + Git worktree。
- 固定插件版本，保留现有 Provider、REA、命令和技能。
- 只本地提交，不自动推送或合并其他分支。
- 文档状态必须与实际安装和验证结果一致。

## 大步骤 1：安全基线与 OpenCode 底座（已完成）

变更：

- 备份全局公共配置，初始化本地 Git 基线和特性分支。
- OpenCode `v2.2.7 → v2.3.2`。
- 配置 Vertex 项目、默认 Neon、`global` 区域和自动压缩。
- 将旧 `provider` / 顶层 MCP 形式迁移为 V2 `providers` / `mcp.servers`。
- 建立 README、架构、接口、快速开始、调研与实施计划。

已验证：

- `opencode --version` 为 `v2.3.2`。
- Vertex Neon 真实调用返回 `VERTEX_NEON_OK`。
- `us-central1` 对新模型不可用的问题已通过 `global` 端点解决。
- REA MCP 为 `connected`。
- 非 Vertex Provider 未用于测试。

## 大步骤 2：OpenCode 原生角色与 Gemini 4 分层路由（已完成）

原方案为 OMO Ultimate。实测 `oh-my-openagent@5.1.79` 后发现其 V2 适配仅加载插件，不运行 Agents、Tools、Hooks；经用户审批改用 OpenCode V2 原生角色层，未以降级或旧 fork 掩盖兼容性问题。

变更：

- 新增 `orchestrator`、`planner`、`implementer`、`architect`、`reviewer`、`visual-evaluator`、`librarian` 原生角色。
- 新增 `/ultracode-plan`、`/ultracode-work`、`/ultracode-review` 三个工作流命令。
- 配置 Neon 主执行、Carbon 深度评审、Hydrogen 高频检索、Argon 视觉/写作，所有角色只使用 Vertex。
- 对推送、硬重置和递归删除保留审批；规划器只能写计划目录，评审角色不能修改实现。

已验证：

- Neon、Carbon、Hydrogen、Argon 在当前 GCP 项目分别真实调用成功。
- 所有原生角色被 OpenCode 正确发现，Neon 主代理和 Carbon 规划/架构角色实调成功。
- 主代理真实启动 `architect` 后台子代理，等待并返回 `BACKGROUND_ARCHITECT_OK`。
- 规划器读取项目并产出包含验收条件的实施计划，REA 保持 `connected`。

预期收益：以当前 OpenCode 原生能力获得轻量、可验证的规划、执行和独立评审链，不承担 OMO V2 未完成迁移的风险。

## 大步骤 3：Superpowers 工程纪律（已完成）

变更：

- 通过 OpenCode 官方插件管理器安装并固定 Superpowers `v7.0.2`。
- 明确其只负责需求澄清、TDD、系统化调试和计划纪律，OpenCode 原生角色负责复杂编排。
- 配置模板已包含相同 Git tag，不维护技能副本。

已验证：

- 在真实会话中分别调用 `brainstorming`、`test-driven-development`、`systematic-debugging`，并自动加载 `verification-before-completion`。
- 在独立临时项目中完成 Node.js 内置测试的 RED → GREEN：缺少实现时失败，初版实现后 11 项通过。
- 独立 reviewer 首轮 `REJECT`，暴露有符号零与反向零区间问题；补充测试先出现 10 pass / 2 fail，再修复至 12/12 通过。
- 二次 reviewer 给出 `APPROVE`，并额外运行 3,375 组边界探针；主会话外也独立复跑确认 12/12 通过。
- 临时项目已清理，REA 保持 `connected`，没有新增运行时依赖到 UltraCode 仓库。

预期收益：减少未澄清就实现、无测试先写实现、调试靠猜测和评审流于形式的问题。

## 大步骤 4：Ralph 全新上下文长跑（已完成）

变更：

- 安装 Open Ralph Wiggum `v1.3.1`，固定 commit `53c87ded9fc329b452298f361145d17bf52cac09`；npm 无对应版本且 Git 准备失败，最终使用官方支持的 Bun 全局安装路径。
- 添加外层 Prompt、Sprint Contract、功能清单、进度、交接和 QA 报告模板。
- 添加 worktree 启动器：固定 Vertex Neon、最大轮数、单任务、严格阻塞信号、任务代理本地提交和最终脏工作区检查。
- Ralph 内部 state/history 被忽略；任务、进度、交接和 Git 是持久审计真源。

已验证：

- 临时项目的两轮任务分别运行于不同 OpenCode session ID，依次实现 `add` 和 `clamp`，每轮都有真实 RED/GREEN，最终 9/9 测试通过。
- 原始 Ralph 达到最大轮数会停止但返回 `0`；启动器将未完成状态转换为退出码 `3`。
- 带原因的 `<promise>BLOCKED: ...</promise>` 不会被识别；改为严格 `<promise>BLOCKED</promise>` 后第一轮停止并返回 `1`，原因保留在交接文件。
- 原始 Ralph 最终完成轮可能不提交修改，因此启动器固定 `--no-commit`，由任务代理验证后提交。
- 在真实 linked worktree 中通过启动器实现 `double`，RED/GREEN 后 12/12 测试通过，创建一个本地提交，最终工作区干净且未推送。
- 主 worktree 运行启动器会以退出码 `2` 拒绝；全局协议与仓库真源一致，临时产物随后清理。

预期收益：真正降低长会话腐烂与上下文焦虑，让长任务由可审查、可恢复的小轮次组成，同时避免最后一轮失去提交边界。

## 大步骤 5：独立视觉 QA、全链路验收与收尾（已完成）

变更：

- 配置固定 `@playwright/mcp@0.0.86`，直接暴露 MCP 工具给 Carbon `visual-evaluator`，其他角色默认拒绝。
- 安装匹配 Chromium 1255；下载期间曾临时使用 1254，最终已移除临时路径并用 1255 完整复验。
- 添加 UI Rubric、桌面/移动硬门槛和逐项 `PASS / FAIL / NOT_VERIFIED` 验收矩阵。
- 视觉评审禁用所有 shell，通用编辑被拒绝，仅 QA 报告与证据目录获得编辑例外。
- 根据独立代码审查修正旧文档状态、QA 截图忽略冲突和 MCP 副作用表述；增加 `--output-dir .opencode/ultracode/qa` 与 Ralph 忽略模板。

已验证：

- 在真实双页面 Fieldnote 应用中，生成者使用纯 HTML/CSS/JS 实现，独立 Carbon 评审通过 Playwright 执行空输入、点击新增、Enter 新增、跨页导航、键盘焦点、桌面/移动溢出和控制台检查；首版四项均 9/10，verdict `APPROVE`。
- 为验证打回能力，明确注入仅破坏 Enter 的回归变异；独立评审实测按钮成功、Enter 失败并给出 `REJECT`，生成者按报告只移除阻断 keydown 处理器，`node --check` 通过。
- 在标准 Chromium 1255 上重新执行全部核心路径，最终报告 `APPROVE`，0 console/page errors，截图已人工查看。
- 无命名截图的最小冒烟返回 `OUTPUT_DIR_SMOKE_OK`，实际文件落入被忽略的 QA 目录，QA 报告不被忽略。
- 独立代码审查曾给出 `REJECT`，其 UI Rubric 跟踪、旧文档、截图/Git 冲突和 MCP 约束表述问题均已修正。
- 最终 Playwright 与 REA 均 `connected`，临时 Web 服务和项目已清理，仓库无敏感信息或运行产物。

预期收益：降低“代码看似完成但核心交互不可用”和生成者自评审美偏高的风险，并形成可复用的独立实机验收闭环。

## 最终完成标准

只有以下条件全部满足，整个 UltraCode 链路才可标记为完整：

1. 原生角色、Superpowers、Ralph、Playwright 均真实加载且版本明确。
2. Gemini 4 路由经当前 GCP 项目实调，无其他 Provider 测试流量。
3. 计划、实现、独立评审、全新上下文和持久交接全部跑通。
4. 至少一个端到端 Web 场景有真实交互和视觉复验证据。
5. 文档与现状一致，回滚路径可执行，本地 Git 审查边界干净。

上述五项均已满足；最终 Git 清洁状态以交付提交后的 `git status` 为证。
