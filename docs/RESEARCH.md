# 社区调研与选型依据

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

结论：外层 Ralph 与内层 OMO 必须同时存在，但小型任务应允许直接执行，避免形式主义和额外 token 开销。

## 3. OpenCode V2 原生能力

官方文档确认：

- [Agents](https://opencode.ai/docs/agents/)：子代理拥有独立上下文，V2.3 起后台运行；可按角色配置模型和权限。
- [Config](https://opencode.ai/docs/config/)：支持自动压缩、工具输出预算、Agent、Skill、MCP 与插件的 V2 配置。
- [Skills](https://opencode.ai/docs/skills/)：技能按需加载，避免把所有方法塞进系统提示词。
- [MCP](https://opencode.ai/docs/mcp-servers/)：V2 服务器位于 `mcp.servers`，MCP 工具会消耗上下文，应只启用必要服务。
- [Plugins](https://opencode.ai/docs/plugins/)：支持固定 npm 版本和完整 Git commit，适合可回滚安装。

本机从 v2.2.7 升到 v2.3.2 后，REA 已恢复并验证为 `connected`。Gemini 4 Neon 的首次区域错误通过官方 [Locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations) 文档定位为端点问题，改用 `global` 后真实调用成功。

## 4. OMO：主编排器

原文引用的 `opensoft/oh-my-opencode` 是旧 fork。当前活跃上游为 [code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)，OpenCode Ultimate 安装方式见 [官方安装指南](https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/installation.md)。

选择它的原因：

- 已有 Sisyphus、Atlas、Prometheus、Oracle、Explore、Librarian 和独立评审角色。
- [Orchestration](https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/orchestration.md) 已提供 `/ulw-plan`、计划顾问/评审、`/ulw-execute`、证据账本和跨会话恢复。
- 内置 Goal、任务持久化、Todo 续跑、模型分类路由、后台任务和回退链。
- 内置 Playwright、Frontend、Visual QA、Review Work 等技能，避免另写一套 Agent 框架。

注意：`/goal` 是原会话的 idle continuation，不提供每轮全新上下文，所以仍需外层 Ralph。

## 5. Superpowers：工程纪律而非第二编排器

[Superpowers OpenCode 安装指南](https://github.com/obra/superpowers/blob/main/.opencode/INSTALL.md) 已支持 OpenCode V2，并通过原生 Skill 注册 brainstorming、TDD、系统化调试等能力。

历史 OMO Issue 曾出现“技能提示可见但无法调用”，上游随后修复了原生插件技能合并问题。由于问题跨越多个版本，步骤 3 仍必须验证真实 Skill 调用，不能只检查插件文件存在。

边界：Superpowers 用于工程纪律；OMO 独占复杂任务编排，避免两个系统同时争抢任务分解与完成裁决。

## 6. Ralph：必须提供真正的新会话

比较了 OMO Goal、会话内 Ralph 插件、`opencode-ralph-rlm`、Go CLI 和 Open Ralph Wiggum。

最终倾向 [Open Ralph Wiggum](https://github.com/Th0rgal/open-ralph-wiggum)：

- CLI 外层反复调用 `opencode run`，每轮是全新上下文。
- 支持任务模式、最大/最小迭代、完成/中止信号、状态监控和中途提示。
- 不需要另起一个常驻 Supervisor 服务，也不与 OMO 争夺内部任务编排。
- 可自定义 Prompt 模板，把 Sprint Contract、功能清单、验证命令和交接协议放入每轮。

`opencode-ralph-rlm` 的持久状态设计很有价值，但其 provider、worker plugin 与 OMO 重叠更多，且需要额外本地服务；当前不作为默认方案。

## 7. Playwright：CLI 与 MCP 分工

[Playwright MCP 官方说明](https://github.com/microsoft/playwright-mcp) 指出：普通 Coding Agent 使用 CLI + Skills 通常更节省 token；持久、需要丰富页面内省和连续浏览器状态的专用 Agent 循环更适合 MCP。

因此：

- 实现代理优先使用 OMO 的 Playwright CLI/Skill。
- 独立 QA 使用固定版本 Playwright MCP，保留连续交互、截图与页面检查能力。
- UI 不能只测静态截图，必须点击关键用户路径并检查真实状态。

## 8. Gemini 4 路由依据

- [Google：Carbon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) 定位最强长程推理、复杂工程、架构、协调与审计。
- [Google：Hydrogen](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-4-hydrogen/) 定位快速日常编码与 Agent 工作流。
- [GitHub：Neon](https://github.blog/changelog/2026-11-18-gemini-4-neon-in-github-copilot/) 定位 Agentic Coding 和多步工具调用，接近 Carbon 且更少非请求变更。
- OMO 默认把 Argon 用于 Visual Engineering 和 Writing，可作为视觉生成的已适配起点。

这只是初始假设。步骤 2 必须用当前 GCP 项目对四个模型做真实调用与角色烟测，再确定最终主用/回退顺序。

## 9. 不采用的方案

- 不用旧 `oh-my-opencode` fork、旧 V1 配置或已移除的 `/ralph-loop` 作为新基线。
- 不同时安装多个同职责 Ralph/OMO 编排器。
- 不把“无限额度”当作无上限并行的理由；仍设置迭代、权限和验证边界。
- 不通过切换其他 Provider 来掩盖 Vertex 模型或区域问题。
- 不宣称配置后即可达到 Claude Code + Claude 的等效能力；最终效果需要真实项目对照和持续校准。
