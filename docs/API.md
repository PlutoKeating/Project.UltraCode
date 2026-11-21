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

## 2. OMO（步骤 2 待实施）

| 接口 | 用途 |
| --- | --- |
| `ulw` / `ultrawork` | 对复杂任务启用调研、编排和验证 |
| `/ulw-plan` | 生成带验收条件和 QA 场景的可评审计划 |
| `/ulw-execute` | 按计划执行、记录证据并接续未完成工作 |
| `/goal` | 设置、暂停、恢复或清除会话内持续目标 |
| `/stop-continuation` | 停止会话内续跑机制 |

实际命令名称、参数和可用性以安装版本的 `oh-my-openagent doctor` 与 OpenCode 实机结果为准。

## 3. Superpowers（步骤 3 待实施）

通过 OpenCode 原生 Skill 机制调用需求澄清、计划、TDD、系统化调试等能力。验收时必须确认技能不仅出现在提示中，而且能在当前会话实际加载。

## 4. Ralph 外层循环（步骤 4 待实施）

计划采用 Open Ralph Wiggum CLI。目标调用形态：

```bash
ralph --prompt-file <经过评审的任务提示> \
  --agent opencode \
  --model google-vertex/gemini-4-neon \
  --tasks \
  --max-iterations <明确上限>
```

最终参数以安装版本为准。长跑必须定义：

- 单个任务与明确范围。
- 项目原生验证命令。
- 最大迭代次数。
- 完成、阻塞和需要人工决策的信号。
- Git worktree、提交边界与人工接管方式。

## 5. 计划与交接制品（步骤 4 待实施）

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
