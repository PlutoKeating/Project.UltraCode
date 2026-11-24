# Installer 架构

`ultracode` 是唯一用户入口，核心实现分布在 `packages/installer/src/` 下 17 个模块，并与 `packages/plugin-gui/` 及 `packages/config/` 协同构建：

- `bin.ts`：独立可执行入口（无条件调用 `dispatch`，避免 Windows 单文件编译下 `import.meta.main` 为 `false` 的运行时陷阱）。
- `cli.ts`：统一 CLI 路由（内置 `apply/sync`、`doctor`、`setup-models`、`upgrade/update/up`、`desktop`、`uninstall`、`ralph`、`_mcp`、`version`、`help`，其余全部透传至官方 `opencode`）。
- `model-onboarding.ts`：纯函数多档模型推荐器（`recommendRoleModels`）与基于 `jsonc-parser` 保留注释的 `agents.<role>.model` 偏好写入器（`ultracode setup-models`）。
- `ui.ts`：极简 TTY 单行动画状态与非 TTY/CI/`NO_COLOR` 纯文本状态输出。
- `desktop.ts`：按平台检测并启动已安装的 OpenCode Desktop，缺失时下载并打开官方桌面安装包。
- `ralph.ts`：跨平台 TypeScript 原生 `ultracode ralph run`（linked Git worktree 守卫、`--worktree <name>` 自动创建/复用、`--init` 模板初始化、默认 50 轮与 `--max-iterations` 去重及退出码契约）。
- `install.ts`：备份、原子写入、schema v2 清单、本地修改保护，以及 `apply` / `doctor` / `uninstall` 主流程。
- `config.ts`：基于 `jsonc-parser` 保留注释的最大并集合并与精确退役删除。
- `components.ts`：基于 `packages/config/upstream-baseline.json` 跨平台识别插件身份与 `-opencode.*` 负向覆盖指令、针对 OpenCode `v2.4+` 后台异步加载插件提供有界 `/api/plugin` 轮询重试、合并权限并复用等价无头隔离 Playwright MCP。
- `managed.ts`：生成受管配置基线（`default_agent: "UltraBuild"`、`agents.{build,plan}.hidden: true`、`-opencode.goal` / `-opencode.plan` 重叠抑制、权限、压缩、`[paths.binary, "_mcp"]` 与插件路径）。
- `manifest.ts`：读写 schema v2 安装清单。
- `runtime.ts`：读取 `packages/config/upstream-baseline.json` 中的固定归档 URL、SHA-256 与 Playwright MCP 版本，使用 Bun 原生 `fetch()` 下载 Superpowers / Ralph 归档，并通过内嵌 Bun 子进程管理 Playwright 与无头浏览器。
- `release.ts`：6 平台资产解析、Bun `fetch()` 下载、SHA-256 校验与 Windows 无锁二进制自更新。
- `opencode.ts`：跨平台查找官方 `opencode`、零前置自动安装/静默升级回退、基于 `upstream-baseline.json` 的 V2 契约底线校验（`>= 2.3.2` 且 `< 3.0.0`，对 `v2.4+` 零误报警告）与 CLI 透传。
- `assets.ts`：将主/子角色、多触点对话插件（`package.json`、`rpc.js`、`goal-gate.js`、`onboarding.js`、`server.js`、`settings.js`、`tui.tsx`、`gui-experimental.cjs`）及 Ralph 模板内嵌进单一二进制。
- `paths.ts`：解析 Linux/macOS XDG 与 Windows `LOCALAPPDATA` 原生路径。
- `fs.ts`：跨平台原子写入、SHA-256、安全文件名备份与 Windows `.old` 重命名替换原语。
