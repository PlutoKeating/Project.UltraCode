# 命令与制品接口

UltraCode 不是网络服务。本文件记录用户命令、配置入口和长程工作制品的约定。规划中的接口在对应大步骤完成前不可视为已安装能力。

## 1. OpenCode 底座（已可用）

### 默认模型

```text
google-vertex/gemini-4-neon
```

Vertex 使用 Application Default Credentials，项目由全局配置或 `GOOGLE_CLOUD_PROJECT` 提供，区域使用 `global`。真实可用性以当前项目的最小调用为准。

### 最小调用

```bash
opencode run --standalone \
  --model google-vertex/gemini-4-neon \
  --agent plan \
  "只回复 VERTEX_NEON_OK，不要调用任何工具。"
```

### 配置检查

```bash
opencode --version
opencode debug config
opencode debug agents
opencode mcp list
```

当前基线要求 OpenCode `v2.3.2`，并保留现有 REA MCP。参考配置见 `config/opencode.example.jsonc`，它只包含公共底座，不是全局配置的覆盖模板。

## 2. OpenCode 原生角色与命令（已可用）

默认主代理为 `orchestrator`，使用 Neon；`planner`、`architect`、`reviewer`、`visual-evaluator` 使用 Carbon；`librarian` 使用 Hydrogen；`implementer` 使用 Neon。所有角色均定义在 `config/opencode/agents/`。

| 接口 | 用途 |
| --- | --- |
| `/ultracode-plan <目标>` | 只读调研并生成任务、验收条件、QA 场景和 Sprint Contract |
| `/ultracode-work <计划或目标>` | 直接实现小任务，或通过原生后台子代理完成较大工作 |
| `/ultracode-review <范围>` | 在独立 Carbon 子代理中审查 diff、验收条件和测试证据 |
| `opencode run --agent architect` | 进行只读架构、复杂调试和方案权衡 |
| `opencode run --agent visual-evaluator` | 在配置浏览器后执行独立实机与视觉评审 |

后台子代理已实测：主代理启动独立 `architect` 会话、等待并返回结果。规划器只能写 `.opencode/plans/**`，评审与视觉评审角色不能修改实现。

## 3. Superpowers（已安装）

固定版本为 `v7.0.2`，通过 OpenCode 原生 Skill 机制加载。已实际调用成功：

- `brainstorming`：在实现前澄清目标、约束和方案。
- `test-driven-development`：先建立失败测试，再实现至通过。
- `systematic-debugging`：先收集证据并定位根因，再修复。
- `verification-before-completion`：完成前验证真实结果。

在对话中明确要求代理调用对应 Skill；也可以写“使用 `test-driven-development` 技能完成这个任务”。Superpowers 提供工程纪律，不替代原生角色的任务编排与独立评审。

## 4. Ralph 外层循环（已可用）

安装版本为 `ralph 1.3.1`，固定上游 commit `53c87ded9fc329b452298f361145d17bf52cac09`。全局协议和启动器位于 `~/.config/opencode/ralph/`，仓库真源为 `config/opencode/ralph/`。

在目标仓库的独立 linked worktree 中准备：

- 目标文件：经过评审的计划或目标文本。
- `.ralph/ralph-tasks.md`：每轮只完成一个顶层任务。
- `.opencode/ultracode/FEATURE_LIST.json` 与 `SPRINT_CONTRACT.md`：需要结构化验收时使用。

启动：

```bash
~/.config/opencode/ralph/run.sh <目标文件> <最大轮数> --no-questions
```

启动器固定 `google-vertex/gemini-4-neon`，默认 `--no-commit --no-allow-all`。协议要求任务代理在验证后创建一个本地提交；无人值守时必须显式追加 `--allow-all`，仍禁止推送。

退出码：`0` 完成且工作区干净；`1` 阻塞或 Ralph 失败；`2` 用法/主 worktree 拒绝；`3` 达到上限或未完成；`5` 最终仍有未提交修改。原始 Ralph 在最大轮数时返回 `0`，启动器已将其转换为 `3`。

## 5. 计划与交接制品（已可用）

模板位于 `~/.config/opencode/ralph/templates/`。`PROGRESS.md`、`HANDOFF.md`、任务清单、Sprint Contract 和功能清单是持久真源；Ralph 内部 state/history 会被更新或删除，不能作为唯一审计记录。

| 制品 | 责任 |
| --- | --- |
| 功能任务清单 | 记录范围、优先级、验收条件和通过状态；不得为制造完成而删改标准 |
| Sprint Contract | 在实现前约定本 Sprint 的用户行为、测试场景、UI 门槛和排除项 |
| Progress / Handoff | 记录已完成、证据、失败原因、下一步和阻塞项 |
| QA Report | 对每个验收条件给出通过/失败、复现步骤和证据位置 |
| UI Rubric | 统一设计质量、原创性、工艺、功能和跨页面一致性的评审口径 |

状态文件与截图等运行产物不直接提交；需要长期保留的规范、计划和评审基线才进入 Git。

## 6. 独立视觉 QA（步骤 5 待实施）

独立评审者必须启动真实应用，通过 Playwright 点击关键路径并检查截图，而不是只阅读前端源码。任何未实际执行的检查都标记为 `NOT_VERIFIED`。

## 7. 最终健康检查

步骤 5 完成后，健康检查至少覆盖：插件加载、Gemini 4 路由、Skill 调用、后台子代理、Ralph 新会话、REA 回归、Playwright 实机交互以及 Git 清洁状态。
