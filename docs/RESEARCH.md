# 社区调研与选型依据

> **历史背景说明**：本文档第 1–9 节记录了 **v0.1.0 之前**围绕个人 Vertex Gemini 4 与 REA 环境的早期选型调研与实测证据。当前公开正式版 UltraCode（v1.1.0）严格保持 **Provider/Model 中立**，不绑定任何特定云厂商、模型或私有 MCP；现行架构请参阅 [架构](ARCHITECTURE.md)。

## 1. 范围与方法

本次调研优先采用官方文档、上游源码、发布记录和 Issue，开发者博客与论坛用于补充实际使用风险。结论是面向“Vertex Gemini 4 + OpenCode 的全栈、长程、多页面生产开发”场景，不追求泛泛地堆砌 Agent 工具。

原始目标中的版本、插件名称和工作流需要按当前上游重新核实。关于专有 Harness 的逆向传闻不作为实现依据；本方案只依赖可验证的公开机制。

## 2. 长程任务的关键公开证据

### Context Reset 不等于 Compaction

[Anthropic：Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 给出的核心模式是：初始化任务清单与启动脚本，每轮只做一个功能，以 Git、进度文件和功能状态接续，并通过浏览器做端到端验证。

[Anthropic：Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) 进一步指出：

- 压缩是在原会话中摘要历史；重置则提供真正干净的新窗口。
- 规划者、生成者、独立评审者分离，可以降低自评宽容。
- Sprint Contract 把高层 Spec 转成实现前就可验证的验收约定。
- 评审者通过 Playwright 操作真实应用，而非只看代码或截图。
- 强模型可能减少某些脚手架需求，因此不能把重型编排无差别应用到所有小任务。

结论：外层 Ralph 与内层独立子代理必须同时存在，但小型任务应允许直接执行，避免形式主义和额外 token 开销。

## 3. OpenCode V2 原生能力

官方文档确认：

- [Agents](https://opencode.ai/docs/agents/)：子代理拥有独立上下文，V2.3 起后台运行；可按角色配置模型和权限。
- [Config](https://opencode.ai/docs/config/)：支持自动压缩、工具输出预算、Agent、Skill、MCP 与插件的 V2 配置。
- [Skills](https://opencode.ai/docs/skills/)：技能按需加载，避免把所有方法塞进系统提示词。
- [MCP](https://opencode.ai/docs/mcp-servers/)：V2 服务器位于 `mcp.servers`，MCP 工具会消耗上下文，应只启用必要服务。
- [Plugins](https://opencode.ai/docs/plugins/)：支持固定 npm 版本和完整 Git commit，适合可回滚安装。

本机从 v2.2.7 升到 v2.3.2 后，REA 已恢复并验证为 `connected`。Gemini 4 Neon 的首次区域错误通过官方 [Locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations) 文档定位为端点问题，改用 `global` 后真实调用成功。

## 4. OMO 实测与原生角色替代

原文引用的 `opensoft/oh-my-opencode` 是旧 fork，当前活跃上游为 [code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)。其实现理念与目标高度匹配，但当前 V2 兼容性不能按文档名称推断。

大步骤 2 实际安装并验证了 `oh-my-openagent@5.1.79`：

- OpenCode 能加载固定版本包，但原生 Agent 列表没有 Sisyphus，直接调用返回 `Agent not found`。
- 上游 [V2 加载修复 PR #10439](https://github.com/code-yeongyu/oh-my-openagent/pull/10439) 明确把“运行 Agents、Tools、Hooks”列为范围外，当前 V2 只显示 OMO Native 引导。
- 社区 `feat/v2-full-parity` fork 停留在旧代码线，已明显落后于当前上游，不作为生产默认。
- 官方 OMO Native 是另一套独立 Harness，不满足保留 OpenCode 主链路的约束。

因此经用户审批，移除不可用插件并恢复底座，改用 OpenCode V2 原生角色层。原生后台子代理、角色模型、权限和命令已经真实验证，不再依赖 OMO 的 `/goal` 或 V1 Hook。

## 5. Superpowers：工程纪律而非第二编排器

[Superpowers OpenCode 安装指南](https://github.com/obra/superpowers/blob/main/.opencode/INSTALL.md) 已支持 OpenCode V2，并通过原生 Skill 注册 brainstorming、TDD、系统化调试等能力。本机已固定 `v7.0.2`，且三个核心 Skill 均在真实会话中调用成功。

历史 OMO Issue 曾出现“技能提示可见但无法调用”。当前方案不再引入 OMO，因此避免了这类跨插件注册表冲突，但步骤 3 仍必须验证真实 Skill 调用，不能只检查插件文件存在。

边界：Superpowers 用于工程纪律；OpenCode 原生角色负责复杂任务编排，避免多个系统同时争抢任务分解与完成裁决。

实际 TDD 验收中，生成者先经历缺少实现的 RED 和初版 GREEN；独立 reviewer 随后给出 `REJECT`，暴露有符号零与反向零区间问题。修复后 12/12 测试通过，二次 reviewer 给出 `APPROVE`，并额外执行 3,375 组边界探针。这验证了技能调用不只是形式存在，且独立评审能推动真实返工。

## 6. Ralph：必须提供真正的新会话

比较了 OMO Goal、会话内 Ralph 插件、`opencode-ralph-rlm`、Go CLI 和 Open Ralph Wiggum。

最终采用 [Open Ralph Wiggum](https://github.com/Th0rgal/open-ralph-wiggum)：

- CLI 外层反复调用 `opencode run`，每轮是全新上下文。
- 支持任务模式、最大/最小迭代、完成/中止信号、状态监控和中途提示。
- 不需要另起一个常驻 Supervisor 服务，也不与 OpenCode 原生角色争夺内部任务编排。
- 可自定义 Prompt 模板，把 Sprint Contract、功能清单、验证命令和交接协议放入每轮。

`opencode-ralph-rlm` 的持久状态设计很有价值，但其 provider、worker plugin 与 OMO 重叠更多，且需要额外本地服务；当前不作为默认方案。

本机安装固定为 `v1.3.1` / commit `53c87de`。npm 没有对应的 `1.3.1` 包，且 Git 依赖准备阶段出现断链问题，最终通过项目官方支持的 Bun 全局路径安装同一 commit。

真实烟测确认了两个不同 OpenCode session ID、每轮 RED/GREEN、任务状态和功能状态更新。也确认了原始工具的三个边界：最大轮数会停止但返回 `0`；阻塞信号必须是严格的 `<promise>BLOCKED</promise>`；最终完成轮可能留下未提交修改并删除内部 state/history。UltraCode 启动器因此使用 `--no-commit`，要求任务代理验证后本地提交，增加 worktree 强制、退出码转换、脏工作区检查和内部运行文件忽略。

## 7. Playwright：CLI 与 MCP 分工

[Playwright MCP 官方说明](https://github.com/microsoft/playwright-mcp) 指出：普通 Coding Agent 使用 CLI + Skills 通常更节省 token；持久、需要丰富页面内省和连续浏览器状态的专用 Agent 循环更适合 MCP。本机固定 `0.0.86`，通过独立 `visual-evaluator` 开放直接 MCP 工具，其他角色默认拒绝。

因此：

- 实现代理优先使用 Playwright CLI/Skill。
- 独立 QA 使用固定版本 Playwright MCP，保留连续交互、截图与页面检查能力。
- UI 不能只测静态截图，必须点击关键用户路径并检查真实状态。

本机最终安装匹配 Chromium 1255。真实 Fieldnote 验收中，独立评审先执行桌面/移动、点击、Enter、空输入、导航、键盘与溢出检查并给出 `APPROVE`。随后通过明确标注的 Enter 阻断变异验证评审能给出 `REJECT`；生成者按报告修复后，标准浏览器完整复验再次 `APPROVE`。自动截图通过 `--output-dir` 落入被忽略的 QA 目录，解决了证据保存与 Git 干净状态的冲突。

## 8. Gemini 4 路由依据

- [Google：Carbon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) 定位最强长程推理、复杂工程、架构、协调与审计。
- [Google：Hydrogen](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-4-hydrogen/) 定位快速日常编码与 Agent 工作流。
- [GitHub：Neon](https://github.blog/changelog/2026-11-18-gemini-4-neon-in-github-copilot/) 定位 Agentic Coding 和多步工具调用，接近 Carbon 且更少非请求变更。
- Argon 用于视觉生成和写作，Carbon 用于高强度视觉复核。

四个模型已在当前 GCP 项目分别完成真实调用。最终角色映射为 Neon 主执行、Carbon 规划/架构/独立评审、Hydrogen 检索、Argon 视觉与写作；没有使用其他 Provider。

## 9. 不采用的方案

- 不用旧 `oh-my-opencode` fork、旧 V1 配置或已移除的 `/ralph-loop` 作为新基线。
- 不同时安装多个同职责 Ralph/OMO 编排器；当前 OMO V2 不具备完整能力时，不把它计入已交付链路。
- 不把“无限额度”当作无上限并行的理由；仍设置迭代、权限和验证边界。
- 不通过切换其他 Provider 来掩盖 Vertex 模型或区域问题。
- 不宣称配置后即可达到 Claude Code + Claude 的等效能力；最终效果需要真实项目对照和持续校准。

## 10. 分发、文档站与上游升级调研（新增）

- [OpenCode 官方 V2 安装脚本](https://opencode.ai/v2/install)只替换用户级二进制并保留配置，因此 UltraCode 采用附加层，不修改 `~/.opencode/bin/opencode`。
- [OpenCode 插件文档](https://opencode.ai/docs/plugins/)支持固定版本、完整 Git commit 和本地插件目录；公开配置合并使用相同公开接缝。
- [VitePress](https://vitepress.dev/guide/markdown)与 Docusaurus/Starlight 均已比较。用户最终选择 Astro Starlight；内容源生成 Stable/Next，不维护重复页面。
- [Bun standalone](https://bun.com/docs/bundler/executables)支持跨平台独立二进制、嵌入文本资产和 `BUN_BE_BUN` 子进程，本机已验证私有运行时无需预装 Node/Bun。
- [GitHub Artifact Attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds)用于发布来源证明；每个平台另附 SHA-256。
- 安装器测试采用 GitHub 干净 VM 与临时 HOME，不引入 Docker，不读取 Provider 凭据，不执行真实模型。

最终设计选择独立 CLI + 最大并集 JSONC 合并，而非 chezmoi 或覆盖模板：UltraCode 的复杂验收和所有权清单需要更深的安装模块，同时用户只接触 `ultracode sync/upgrade/doctor` 等小接口。
