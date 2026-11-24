# 命令与制品接口

## 统一 `ultracode` CLI

`ultracode` 是唯一用户命令（Linux/macOS 位于 `~/.local/bin/ultracode`，Windows 位于 `%LOCALAPPDATA%\ultracode\bin\ultracode.exe`）。

| 命令 | 行为 | 真实模型调用 |
| --- | --- | --- |
| `ultracode` / `ultracode <path>` / `ultracode <opencode-args...>` | 直接透传启动官方 `opencode`（包括 `pair`、`run`、`mini`、`serve`、`mcp list`、`models`、`auth` 等全部子命令与标志） | 由用户会话决定 |
| `ultracode desktop` | 启动已安装的官方 OpenCode Desktop；未安装时下载并打开当前平台官方安装包 | 否 |
| `ultracode pair [--remote]` | 透传至 `opencode pair`，输出浏览器/移动端配对链接与二维码 | 否 |
| `ultracode setup-models [--recommended \| --inherit \| --status]` | 按已配置模型池向 `opencode.jsonc` 写入或重置可选的分角色模型偏好（保留注释，不改动 `agents/*.md`） | 否 |
| `ultracode upgrade`（别名 `update`、`up`） | 自动检测安装/升级官方 OpenCode V2 → 更新 UltraCode 二进制 → 执行 `sync` | 否 |
| `ultracode sync`（别名 `apply`） | 幂等应用配置、插件、角色与私有运行时 | 否 |
| `ultracode doctor` | 校验 OpenCode 版本、受管文件、插件活动状态、重叠抑制、角色与 MCP 连接状态 | 否 |
| `ultracode uninstall [--yes]` | 精确移除未修改的 UltraCode 受管状态、运行时与自身二进制（保留用户配置与备份并还原默认插件/角色） | 否 |
| `ultracode ralph run <goal-file> [max-iterations] [--worktree <name>] [--init] [flags...]` | 跨平台 TypeScript 原生 linked-worktree Ralph 运行器（默认最多 50 轮，支持自动创建关联 worktree 与初始化契约模板） | 由用户任务决定 |
| `ultracode ralph [args...]` | 直接透传至受管私有 Ralph CLI | 由用户任务决定 |
| `ultracode _mcp [args...]` | 内部命令：启动受管私有 Playwright MCP 服务 | 否 |
| `ultracode version` / `-v` / `--version` | 输出当前 UltraCode 版本 | 否 |
| `ultracode help` / `-h` / `--help` | 输出极简命令帮助 | 否 |

## OpenCode 角色、工具与跨端控制面

- **主角色**（安装在 `agents/`，`Shift+Tab` 切换）：`UltraBuild`（默认总协调与执行）、`UltraPlan`（只读规划）。
- **后台子代理**（安装在 `agents/ultracode/`）：`architect`、`implementer`、`librarian`、`reviewer`、`visual-evaluator`。
- 所有角色均不含 `model` 字段，默认继承当前 OpenCode 会话模型。

`ultracode-conversation` 插件包提供以下工具、RPC 与多端 UI 控制项：

| 接口 / 控制项 | 触点 | 说明 |
| --- | --- | --- |
| `/goal [--auto] <objective>` / `pause` / `resume` / `clear` / `status` | Web / Mobile / TUI / Desktop | UltraCode 统一目标引擎入口：支持前置澄清（`direction: manual`）或全自主推进（`--auto`），具备 60 轮上限、工作区确定性证据门禁、3 次无进展停滞熔断、重启转 `paused` 安全恢复与压缩后 `<ultracode_goal_anchor>` 目标锚定。 |
| `/review [scope]` | Web / Mobile / TUI / Desktop | 强制派遣独立 `ultracode/reviewer`（涉及界面时协同 `ultracode/visual-evaluator`）对真实 Git diff 与运行界面做独立验收，杜绝同上下文自评。 |
| `/setup-models [recommended \| inherit \| status]` | Web / Mobile / TUI / Desktop | 交互式或零 Token（`recommended` / `inherit`）配置分角色模型偏好至 `opencode.jsonc`。 |
| `ultracode_checkpoint` | Server 会话工具 | 登记当前会话下一里程碑（`{ next: string }`），统一写入持久化 `goal:<sessionID>` 记录并受 60 轮上限与连续 3 次停滞熔断保护。 |
| `ultracode_task_graph` | Server 会话工具 | 结构化读写 `.opencode/ultracode/FEATURE_LIST.json`（`status` / `init` / `claim` / `verify` / `block`），强制校验前置依赖、并行 `ownedFiles` 不冲突及真实 `executedCommand` + `evidenceSummary` 证据。 |
| `ultracode_model` | Server 会话工具 | 列出可用模型 ID（兼容数组与分页对象结构），或在用户明确指定/授权模型池内切换会话模型。 |
| `UltraCodeRpc` (`getState` / `setMode` / `toggleMode` / `clearCheckpoint` / `pauseGoal` / `resumeGoal` / `clearGoal` / `changed`) | Server ↔ TUI / Desktop | 跨进程实时状态读写、会话目标暂停/继续/清除与事件同步契约（`getState` 返回 `{ permissions, direction, version, checkpoints, goals }`）。 |
| `/approvals` / `/direction` | Web / Mobile / TUI / Desktop | 服务端注册命令（实时展示当前模式，支持无参翻转或传入 `auto` / `manual`，零模型调用）。 |
| `ComposerPill` (`UltraCode`) | OpenCode Desktop | 输入框上方胶囊菜单，两行一键切换 **Auto-approve** 与 **Ask on direction**；存在会话 Goal 或里程碑时动态展示轮次状态、摘要及一键 **Pause / Resume / Clear**（6 国语言）。 |
| `SettingsPage` (`UltraCode`) | OpenCode Desktop | **Settings → UltraCode** 独立设置页，提供两项原生开关（6 国语言）。 |
| `ultracode.toggle-permissions` / `ultracode.toggle-direction` / `ultracode.goal-pause-resume` / `ultracode.goal-clear` | TUI & Desktop/Web 命令面板 | 切换双开关并一键暂停/恢复或清除当前会话目标。 |

模式状态文件（原子写入）：

- `$ULTRACODE_HOME/permissions.mode`（`auto` 或 `manual`，默认 `auto`）
- `$ULTRACODE_HOME/direction.mode`（`auto` 或 `manual`，默认 `manual`）

## Ralph

```bash
ultracode ralph run <目标文件> [最大轮数] [--worktree <名称>] [--init] --no-questions
```

在专用 linked Git worktree 中运行（若在主工作区传入 `--worktree <名称>` 会自动创建或复用旁路关联 worktree；传入 `--init` 会自动初始化 `.ralph/ralph-tasks.md` 与 `.opencode/ultracode/` 验收契约模板；默认最多 `50` 轮，支持 `--max-iterations <n>` / `-n <n>`）。默认 `--no-commit --no-allow-all`；无人值守时可显式追加 `--allow-all`。

退出码：`0` 完成且工作区干净；`1` 阻塞/失败；`2` 用法或非 linked worktree 拒绝；`3` 达到上限或未完成；`5` 存在未提交改动。

## 路径、环境变量与 Release 资产

| 平台 | `ULTRACODE_HOME` 默认值 | `ULTRACODE_BIN_DIR` 默认值 | OpenCode 配置目录默认值 |
| --- | --- | --- | --- |
| Linux / macOS | `${XDG_DATA_HOME:-$HOME/.local/share}/ultracode` | `$HOME/.local/bin` | `${XDG_CONFIG_HOME:-$HOME/.config}/opencode` |
| Windows | `%LOCALAPPDATA%\ultracode` | `%LOCALAPPDATA%\ultracode\bin` | `%USERPROFILE%\.config\opencode` |

常用环境变量：`ULTRACODE_HOME`、`ULTRACODE_BIN_DIR`、`OPENCODE_CONFIG_DIR`、`ULTRACODE_OPENCODE_BIN`、`ULTRACODE_VERSION`、`ULTRACODE_REPOSITORY`、`ULTRACODE_RELEASE_BASE_URL`、`NO_COLOR`。

Release 资产命名（6 平台，均附 `.sha256`）：
- `ultracode-linux-x64`、`ultracode-linux-arm64`
- `ultracode-darwin-x64`、`ultracode-darwin-arm64`
- `ultracode-windows-x64.exe`、`ultracode-windows-arm64.exe`

安装脚本由教程网站同步托管于 `/install.sh` 与 `/install.ps1`。

## 上游探测与实机金丝雀脚本（维护者 / CI）

```bash
bun run scripts/check-upstreams.ts [--json | --markdown] [--fail-on-outdated] [--verify-live]
```

读取 `packages/config/upstream-baseline.json`，零模型调用检查 OpenCode（含 `@opencode/plugin` 导出面）、Superpowers、Playwright MCP 与 Ralph 上游更新；传入 `--verify-live` 时在隔离临时 `HOME` 沙箱中执行 GUI SDK 兼容性构建与真实 `opencode` 宿主的 `apply` + `doctor` 契约验证。

## 版本基线

UltraCode `v1.1.1`、OpenCode `v2.3.2+`（已验证基线 `v2.4.1`，`@opencode/plugin@2.4.1`）、Superpowers `v7.0.2`、Ralph `v1.3.1` 固定 commit、Playwright MCP `0.0.86`（统一维护于 `packages/config/upstream-baseline.json`）。
