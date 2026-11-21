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

## 大步骤 4：Ralph 全新上下文长跑（待批准）

变更：

- 安装固定版本 Open Ralph Wiggum `v1.3.1`。
- 添加外层 Prompt 模板、Sprint Contract、功能清单、进度/交接协议和完成信号。
- 每轮只处理一个任务，设置最大轮数、项目验证命令和独立 worktree。
- 内层调用 OpenCode 原生后台子代理与独立评审，外层由 Ralph 创建新会话。

验证：

- 用临时小项目完成至少两轮可观察的新 `opencode run`。
- 验证测试失败会打回、进度可恢复、达到上限会停止、阻塞会等待人工。
- 检查每轮 Git 变更和交接文件，而不是只检查进程退出码。

预期收益：真正降低长会话腐烂与上下文焦虑，让 8–9 小时任务由可审查的小轮次组成。

## 大步骤 5：独立视觉 QA、全链路验收与收尾（待批准）

变更：

- 配置固定版本 Playwright MCP，并保留 Playwright CLI/Skill 作为实现侧轻量路径。
- 添加 UI Rubric、Sprint 视觉门槛和独立 Carbon 评审流程。
- 覆盖关键用户路径、跨页面一致性、响应式、可访问性、交互状态与截图证据。
- 更新全部文档、依赖清单、回滚说明和最终健康检查。

验证：

- 在临时真实 Web 应用上完成生成 → 独立评审 → 打回 → 修复 → 复验。
- 确认未点击、未运行或未截图的检查不会标记为通过。
- 全链路真实调用、REA 回归、无敏感文件入库、Git 无未提交/未跟踪文件。

预期收益：降低“代码看似完成但核心交互不可用”和“自我审美评价偏高”的风险。

## 最终完成标准

只有以下条件全部满足，整个 UltraCode 链路才可标记为完整：

1. 原生角色、Superpowers、Ralph、Playwright 均真实加载且版本明确。
2. Gemini 4 路由经当前 GCP 项目实调，无其他 Provider 测试流量。
3. 计划、实现、独立评审、全新上下文和持久交接全部跑通。
4. 至少一个端到端 Web 场景有真实交互和视觉复验证据。
5. 文档与现状一致，回滚路径可执行，本地 Git 审查边界干净。
