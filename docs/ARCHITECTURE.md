# UltraCode 架构

## 1. 目标

UltraCode 解决两类问题：长程工程中的目标漂移、上下文腐烂与自评宽容；以及在 macOS、Linux、Windows 新机、已有复杂配置和 OpenCode 官方升级后的零前置可重复安装与全触点一致性。

核心约束：单一 `ultracode` 命令、Provider/Model 中立、不读取凭据、不做真实模型安装测试、不侵入官方 CLI 或 Desktop 二进制。

## 2. 长程工作流与目标工程（Goal Engineering）

```text
用户目标 / Spec（自然语言，来自 TUI / Desktop / Web / Mobile）
  → UltraBuild（默认主角色）/ UltraPlan（Shift+Tab 只读规划）
  → ultracode-conversation 多触点插件包（Server RPC + TUI + Desktop/Web/Mobile GUI）
  → Superpowers：澄清、TDD、系统化调试
  → 后台子代理（agents/ultracode/）：architect / implementer / librarian / reviewer / visual-evaluator
  → ultracode ralph run 外层全新会话循环（需要彻底重置上下文时）
  → Git、任务、Progress、Handoff 持久化
```

子代理隔离会话内上下文，Ralph 在顶层迭代之间创建新会话。二者不可互相替代。所有角色不包含 `model`，默认继承当前 OpenCode 会话模型；模型可通过 `ultracode_model` 查询可用模型池并在用户授权范围内切换。

## 3. 多触点插件包与实时 RPC 控制面

UltraCode 在 `<config>/ultracode/conversation/` 安装单一多触点插件包（`package.json` 导出 `.`、`./tui`、`./gui-experimental`、`./rpc`）：

- **RPC 契约（`rpc.js`）**：基于 `@opencode/plugin/rpc` 定义零运行时依赖的 `UltraCodeRpc`（方法 `getState`、`setMode`、`toggleMode`，事件 `changed`）。
- **Server 入口（`server.js`，ID `ultracode-conversation`）**：
  - 注册 `UltraCodeRpc` 与 `/approvals`、`/direction` 服务端命令，修改模式时广播 `changed` 事件并刷新命令描述，使 TUI、Desktop 与远程 Web/Mobile 会话实时同步。
  - 注册 `permission.evaluate`（`permissions` 为 `auto` 时放行 `ask`，显式 `deny` 始终生效）、`ultracode_model`、`ultracode_checkpoint`、`session.prompt`、`session.context` 与 `experimental.idle` 续跑钩子。
- **TUI 入口（`tui.tsx`，ID `ultracode-conversation-ui`）**：
  - 在命令面板（`UltraCode` 分组）注册双开关，调用 `UltraCodeRpc`（带本地回退），并在 `home.footer.status` 提供克制的 `UltraCode` 状态标识。
- **GUI 入口（`gui-experimental.cjs`，由 `plugin-gui/` 通过 Vite + `@opencode/plugin/gui/vite` 预编译为单文件 CJS 并内嵌至二进制）**：
  - 在 OpenCode Desktop 界面提供输入框上方的 **UltraCode** `ComposerPill`（两行一键切换）、独立的 **Settings → UltraCode** 页面（`SettingsLayout` + 双 `Switch`）以及命令面板动作，支持中英双语（`en` / `zh`）。

模式状态原子持久化至 `$ULTRACODE_HOME/permissions.mode` 与 `$ULTRACODE_HOME/direction.mode`（Linux/macOS 默认 `~/.local/share/ultracode`，Windows 默认 `%LOCALAPPDATA%\ultracode`）。

## 4. 统一 CLI 与分发模块

```text
                       ultracode CLI 路由
   内置命令：apply/sync | doctor | upgrade/update/up | desktop | ralph | _mcp | uninstall | version | help
   其余全部参数 / 路径 / 子命令（如 pair、run、mcp list、models 等）→ 直接透传至官方 opencode
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
  Install & Config        OpenCode & Desktop       Runtime & Ralph
  最大并集 JSONC / 清单     零前置安装升级 / 桌面启动   Bun fetch / 浏览器 / TS Ralph
```

- **零前置 OpenCode 管理（`opencode.ts`、`install.sh`、`install.ps1`）**：自动查找官方 `opencode`；缺失时通过官方渠道安装（Linux/macOS 官方安装脚本，Windows 官方独立 zip 包写入 `%LOCALAPPDATA%\opencode\bin` 并加入用户 `PATH`）；存在时静默尝试 `opencode upgrade`，若离线或包管理器接管导致升级返回非零但现有版本满足 `>= 2.3.2`，自动平稳保留继续执行。
- **Windows 原生一等公民（`paths.ts`、`fs.ts`、`release.ts`、`ralph.ts`）**：所有网络下载使用 Bun 原生 `fetch()` + SHA-256 校验；Windows 下通过重命名运行中 `.exe` 为 `.old` 实现无锁自更新与卸载清理；`ultracode ralph run` 使用纯 TypeScript 实现 linked worktree 守卫与模板初始化，不依赖 bash；托管 Playwright MCP 使用内部命令 `[paths.binary, "_mcp"]`，避免遮蔽 `ultracode mcp <subcommand>` 透传。

## 5. 最大并集合并与精确卸载

- JSONC 注释、未知字段、已有 Provider、Model、MCP、Skill 原样保留；对象递归补键，数组去重追加，标量冲突保留用户值并提示。
- 清单（schema v2）记录安装器新增配置路径与受管文件 SHA-256；本地修改过的受管文件在同步与卸载时均受保护不被覆盖或误删。

## 6. 网站与 6 平台构建发布

`website/` 使用 Astro Starlight 构建中英双语站点，`sync-content.mjs` 将根 `install.sh` 与 `install.ps1` 同步至 `website/public/`，由 Cloudflare Workers Static Assets 发布至 `https://ultracode.plutokeating.beer/`。

`installer/scripts/build.ts --release` 先构建 `plugin-gui`，再由单个 Linux Runner 交叉编译 6 个目标（`linux-x64`、`linux-arm64`、`darwin-x64`、`darwin-arm64`、`windows-x64.exe`、`windows-arm64.exe`），生成 `.sha256` 与 GitHub Artifact Attestations 并发布 Release。
