# Installer 架构

`ultracode` 是唯一用户入口，核心实现分布在 `installer/src/` 下 16 个模块，并与 `plugin-gui/` 协同构建：

- `bin.ts`：独立可执行入口（无条件调用 `dispatch`，避免 Windows 单文件编译下 `import.meta.main` 为 `false` 的运行时陷阱）。
- `cli.ts`：统一 CLI 路由（内置 `apply/sync`、`doctor`、`upgrade/update/up`、`desktop`、`uninstall`、`ralph`、`_mcp`、`version`、`help`，其余全部透传至官方 `opencode`）。
- `ui.ts`：极简 TTY 单行动画状态与非 TTY/CI/`NO_COLOR` 纯文本状态输出。
- `desktop.ts`：按平台检测并启动已安装的 OpenCode Desktop，缺失时下载并打开官方桌面安装包。
- `ralph.ts`：跨平台 TypeScript 原生 `ultracode ralph run`（linked Git worktree 守卫、模板初始化与退出码契约）。
- `install.ts`：备份、原子写入、schema v2 清单、本地修改保护，以及 `apply` / `doctor` / `uninstall` 主流程。
- `config.ts`：基于 `jsonc-parser` 保留注释的最大并集合并与精确退役删除。
- `components.ts`：跨平台识别插件身份、权限与等价无头隔离 Playwright MCP 复用。
- `managed.ts`：生成受管配置基线（`default_agent: "UltraBuild"`、权限、压缩、`[paths.binary, "_mcp"]` 与插件路径）。
- `manifest.ts`：读写 schema v2 安装清单。
- `runtime.ts`：使用 Bun 原生 `fetch()` + SHA-256 下载固定版本 Superpowers / Ralph 归档，通过内嵌 Bun 子进程管理 Playwright 与无头浏览器。
- `release.ts`：6 平台资产解析、Bun `fetch()` 下载、SHA-256 校验与 Windows 无锁二进制自更新。
- `opencode.ts`：跨平台查找官方 `opencode`、零前置自动安装/静默升级回退、版本校验与 CLI 透传。
- `assets.ts`：将主/子角色、多触点对话插件（`package.json`、`rpc.js`、`server.js`、`settings.js`、`tui.tsx`、`gui-experimental.cjs`）及 Ralph 模板内嵌进单一二进制。
- `paths.ts`：解析 Linux/macOS XDG 与 Windows `LOCALAPPDATA` 原生路径。
- `fs.ts`：跨平台原子写入、SHA-256、安全文件名备份与 Windows `.old` 重命名替换原语。
