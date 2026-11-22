# 命令与制品接口

## 统一 `ultracode` CLI

`ultracode` 是唯一用户命令（Linux/macOS 位于 `~/.local/bin/ultracode`，Windows 位于 `%LOCALAPPDATA%\ultracode\bin\ultracode.exe`）。

| 命令 | 行为 | 真实模型调用 |
| --- | --- | --- |
| `ultracode` / `ultracode <path>` / `ultracode <opencode-args...>` | 直接透传启动官方 `opencode`（包括 `pair`、`run`、`mini`、`serve`、`mcp list`、`models`、`auth` 等全部子命令与标志） | 由用户会话决定 |
| `ultracode desktop` | 启动已安装的官方 OpenCode Desktop；未安装时下载并打开当前平台官方安装包 | 否 |
| `ultracode pair [--remote]` | 透传至 `opencode pair`，输出浏览器/移动端配对链接与二维码 | 否 |
| `ultracode upgrade`（别名 `update`、`up`） | 自动检测安装/升级官方 OpenCode V2 → 更新 UltraCode 二进制 → 执行 `sync` | 否 |
| `ultracode sync`（别名 `apply`） | 幂等应用配置、插件、角色与私有运行时 | 否 |
| `ultracode doctor` | 校验 OpenCode 版本、受管文件、插件活动状态、角色与 MCP 连接状态 | 否 |
| `ultracode uninstall [--yes]` | 精确移除未修改的 UltraCode 受管状态、运行时与自身二进制（保留用户配置与备份） | 否 |
| `ultracode ralph run <goal-file> [max-iterations] [flags...]` | 跨平台 TypeScript 原生 linked-worktree Ralph 运行器 | 由用户任务决定 |
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
| `ultracode_checkpoint` | Server 会话工具 | 登记下一里程碑（`{ next: string }`）；空字符串或新用户输入清除调度。 |
| `ultracode_model` | Server 会话工具 | 列出可用模型 ID，或在用户明确指定/授权模型池内切换会话模型。 |
| `UltraCodeRpc` (`getState` / `setMode` / `toggleMode` / `changed`) | Server ↔ TUI / Desktop / Web | 跨进程、跨远程浏览器/移动端的实时状态读写与事件同步契约。 |
| `ComposerPill` (`UltraCode`) | Desktop / Web / Mobile | 输入框上方胶囊菜单，两行一键切换 **Auto-approve** 与 **Ask on direction**。 |
| `SettingsPage` (`UltraCode`) | Desktop / Web / Mobile | **Settings → UltraCode** 独立设置页，提供两项原生开关。 |
| `ultracode.toggle-permissions` / `ultracode.toggle-direction` | TUI & Desktop/Web 命令面板 | 切换 **Command approvals**（默认 `auto`）与 **Direction questions**（默认 `manual`）。 |

模式状态文件（原子写入）：

- `$ULTRACODE_HOME/permissions.mode`（`auto` 或 `manual`，默认 `auto`）
- `$ULTRACODE_HOME/direction.mode`（`auto` 或 `manual`，默认 `manual`）

## Ralph

```bash
ultracode ralph run <目标文件> [最大轮数] --no-questions
```

要求在专用 linked Git worktree 中运行且存在 `.ralph/ralph-tasks.md`。默认 `--no-commit --no-allow-all`；无人值守时可显式追加 `--allow-all`。

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

## 版本基线

UltraCode `v0.3.0`、OpenCode `v2.3.2+`、Superpowers `v7.0.2`、Ralph `v1.3.1` 固定 commit、Playwright MCP `0.0.86`。
