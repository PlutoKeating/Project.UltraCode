# 命令与制品接口

## UltraCode CLI

| 命令 | 行为 | 真实模型调用 |
| --- | --- | --- |
| `uc apply` | 完整幂等安装 | 否 |
| `uc sync` | apply 别名；官方升级后修复 | 否 |
| `uc doctor` | 版本、文件、插件活动状态、角色和 MCP 连接检查 | 否 |
| `uc update` | 更新 UltraCode 稳定 Release 并 sync | 否 |
| `uc up` | 官方 OpenCode 升级 + UltraCode 更新 + sync | 否 |
| `uc uninstall --yes` | 删除未修改的 UltraCode 所有状态 | 否 |
| `uc version` | 输出版本 | 否 |
| `uc ralph ...` | 执行私有 Ralph | 由用户任务决定 |
| `uc mcp` | 启动私有 Playwright MCP | 否 |

## OpenCode 角色与工具

- **主角色**（直接安装在 `agents/`，可用 `Shift+Tab` 切换）：
  - `UltraBuild`：默认主角色，负责总协调与执行。
  - `UltraPlan`：规划角色，负责需求澄清、架构与计划制定。
- **后台子代理**（安装在 `agents/ultracode/`）：`architect`、`implementer`、`librarian`、`reviewer`、`visual-evaluator`。
- 所有角色均不含 `model` 字段，默认继承当前 OpenCode 会话模型。

通过普通自然语言对话表达目标（旧版 `/ultracode-*` 斜杠命令已退役）。`ultracode-conversation` 与 `ultracode-conversation-ui` 插件提供以下运行时工具与 TUI 控制项：

| 接口 / 控制项 | 类型 | 说明 |
| --- | --- | --- |
| `ultracode_checkpoint` | 会话工具（`{ next: string }`） | 登记下一里程碑；传入空字符串清除当前续跑调度。新用户输入会自动清除旧调度。 |
| `ultracode_model` | 会话工具（`{ providerID?: string, id?: string }`） | 省略参数列出可用模型 ID；传入 `providerID` 与 `id` 在用户明确指定或授权模型池内切换当前会话模型。 |
| `ultracode.toggle-permissions` | TUI 命令面板（`UltraCode` 分组） | 切换 **Command approvals**（`auto` / `manual`，默认 `auto`；显式 `deny` 始终生效）。 |
| `ultracode.toggle-direction` | TUI 命令面板（`UltraCode` 分组） | 切换 **Direction questions**（`manual` / `auto`，默认 `manual`）。 |

模式状态文件（`0600` 权限，原子写入）：

- `$ULTRACODE_HOME/permissions.mode`（内容为 `auto` 或 `manual`，缺失时默认 `auto`）
- `$ULTRACODE_HOME/direction.mode`（内容为 `auto` 或 `manual`，缺失时默认 `manual`）

## Ralph

```bash
~/.config/opencode/ultracode/run.sh <目标文件> <最大轮数> --no-questions
```

要求 linked Git worktree 和 `.ralph/ralph-tasks.md`。默认 `--no-commit --no-allow-all`，任务代理验证后创建一个本地提交。无人值守时显式追加 `--allow-all`。

退出码：`0` 完成且干净；`1` 阻塞/失败；`2` 用法或 worktree 拒绝；`3` 上限/未完成；`5` 最终有未提交修改。

## 持久制品

- `.ralph/ralph-tasks.md`
- `.ralph/PROGRESS.md`
- `.ralph/HANDOFF.md`
- `.opencode/ultracode/FEATURE_LIST.json`
- `.opencode/ultracode/SPRINT_CONTRACT.md`
- `.opencode/ultracode/UI_RUBRIC.md`
- `.opencode/ultracode/QA_REPORT.md`

自动截图进入被忽略的 `.opencode/ultracode/qa/`。Ralph 内部 state/history 不是唯一审计记录。

## 路径、环境变量与 Release

默认 CLI 在 `~/.local/bin`，数据在 `~/.local/share/ultracode`，OpenCode 配置在 `~/.config/opencode`。遵循 XDG 与 `OPENCODE_CONFIG_DIR`。

常用 `ULTRACODE_*` 环境变量：

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `ULTRACODE_HOME` | UltraCode 数据、运行时、清单与模式文件目录 | `${XDG_DATA_HOME:-$HOME/.local/share}/ultracode` |
| `ULTRACODE_BIN_DIR` | `ultracode` / `uc` 二进制安装目录 | `$HOME/.local/bin` |
| `ULTRACODE_VERSION` | `install.sh` 指定的固定 Release 版本号（如 `v0.2.2`） | `latest` |
| `ULTRACODE_REPOSITORY` | `install.sh` 下载 Release 的 GitHub 仓库 | `PlutoKeating/Project.UltraCode` |
| `ULTRACODE_RELEASE_BASE_URL` | 覆盖 `install.sh` 的 Release 下载基地址（镜像/离线安装） | 按仓库与版本推导 |

Release 资产命名：`ultracode-{linux|darwin}-{x64|arm64}`，附 `.sha256`。根 `install.sh` 同时由教程网站发布。

## 版本基线

UltraCode `v0.2.2`、OpenCode V2.3.2+、Superpowers `v7.0.2`、Ralph `v1.3.1` 固定 commit、Playwright MCP `0.0.86`。所有安装验收均不调用真实模型。
