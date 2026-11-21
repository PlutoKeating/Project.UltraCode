# UltraCode

UltraCode 是一套面向 OpenCode 的长程软件工程增强链路，目标是在 Vertex AI Gemini 4 模型上获得更接近成熟一线 Coding Agent 的持续交付能力。它增强的是目标保持、上下文交接、角色分工、真实验证和视觉评审，不承诺通过提示词复制某个专有模型或 Harness。

## 核心设计

```text
需求澄清与 TDD 纪律
  → 可评审计划与 Sprint Contract
  → 多代理分工实现
  → 独立代码/实机/视觉评审
  → 全新上下文迭代
  → Git、任务状态与交接文件持久化
```

主要原则：

- 只使用 `google-vertex` 的 Gemini 4 模型执行本项目验证，其他 Provider 不参与测试。
- 长会话压缩与全新上下文重置互补，二者不互相替代。
- 完成必须由测试、真实交互和独立评审证明，而不是由生成者自行宣布。
- 优先复用 OpenCode 原生后台子代理、Superpowers、Open Ralph Wiggum 和 Playwright，不重复实现已有编排器。
- 长跑使用宿主机权限边界和独立 Git worktree；默认不自动推送远程。

## 当前状态

| 大步骤 | 状态 |
| --- | --- |
| 1. 安全基线与 OpenCode 底座 | 已完成：OpenCode v2.3.2、Vertex Neon、全局区域、自动压缩、REA 回归 |
| 2. OpenCode 原生角色与 Gemini 4 分层路由 | 已完成：原生后台子代理、规划/实现/架构/独立评审角色与命令 |
| 3. Superpowers 工程纪律 | 已完成：v7.0.2、真实 Skill 调用、RED/GREEN 与独立评审打回复验 |
| 4. Ralph 全新上下文长跑 | 已完成：v1.3.1 固定 commit、两轮新会话、阻塞/上限、独立 worktree 与干净提交 |
| 5. 独立视觉 QA 与全链路验收 | 待批准 |

当前仓库提供原生角色、工作流命令、配置模板、调研结论、目标架构和分步实施计划。后续功能只有在对应大步骤获批、实施并验证后才会标记为可用。

大步骤 2 未采用 OMO：当前官方 OMO V2 适配仅加载插件，不运行 Agents、Tools、Hooks。经路线审批后，已由 OpenCode V2 原生角色层替代，详见 [调研记录](docs/RESEARCH.md)。

## 文档

- [快速开始](docs/QUICK_START.md)
- [目标架构](docs/ARCHITECTURE.md)
- [命令与制品接口](docs/API.md)
- [社区调研与选型依据](docs/RESEARCH.md)
- [分步实施计划](docs/IMPLEMENTATION_PLAN.md)
- [原始目标](docs/ORIGIN_GOAL.md)

## 配置边界

`config/opencode.example.jsonc` 是不含凭据和本机项目 ID 的参考模板。`config/opencode/agents/` 与 `config/opencode/commands/` 是原生角色和命令的仓库真源，已同步到 `~/.config/opencode/` 对应目录。实际全局配置位于 `~/.config/opencode/opencode.jsonc`；已有 Provider、MCP、命令和技能应保留，不能用示例文件直接覆盖。

所有项目变更只在本地特性分支提交。不得把凭据、真实 `.env`、会话数据库、测试截图、缓存或依赖目录纳入 Git。
