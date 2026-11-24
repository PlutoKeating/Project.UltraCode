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

UltraCode 在 `<config>/ultracode/conversation/` 安装单一多触点插件包（`package.json` 导出 `.`、`./tui`、`./gui-experimental`、`./rpc`，内含 `goal-gate.js` 与 `onboarding.js`），并在受管配置中可逆停用重叠内置插件（`-opencode.goal`、`-opencode.plan`）及隐藏原生 `build`/`plan` 主角色（卸载时完整还原）：

- **RPC 契约（`rpc.js`）**：基于 `@opencode/plugin/rpc` 定义零运行时依赖的 `UltraCodeRpc`（方法 `getState`、`setMode`、`toggleMode`、`clearCheckpoint`、`pauseGoal`、`resumeGoal`、`clearGoal`，事件 `changed`，状态包含 `permissions`、`direction`、`version`、`checkpoints` 兼容映射与统一 `goals` 状态表）。
- **确定性证据门禁与任务图（`goal-gate.js`）**：零 Token 校验 `.opencode/ultracode/FEATURE_LIST.json`（拦截 `passes !== true` 或缺少真实 `executedCommand` 证据的条目，通过 `ultracode_task_graph` 强制校验前置依赖与并行 `ownedFiles` 不重叠）、`.opencode/ultracode/QA_REPORT.md`（拦截 `REJECT` 或未消解的 `FAIL`）与 `.ralph/ralph-tasks.md`（未勾选任务），并生成轮次/时间戳无关、对 Prompt Cache 友好的 `<ultracode_goal_anchor>` 目标锚点。
- **分层模型偏好引导（`onboarding.js` + `model-onboarding.ts`）**：不引入侵入式运行时动态切模路由，而是通过 `ultracode setup-models` 与 `/setup-models`（及首次根会话一次性非阻塞提示 `$ULTRACODE_HOME/onboarding.json`）按 `deep` / `coding` / `fast` / `visual` 四档推荐模型组合，以保留注释的 JSONC 增量编辑写入 `opencode.jsonc` 的 `agents.<role>.model`，绝不修改受管 `agents/*.md` 文件哈希。
- **Server 入口（`server.js`，ID `ultracode-conversation`）**：
  - 统一接管 `/goal`（支持 `<objective>`、`--auto`、`pause`、`resume`、`clear`、`status`）、`/review`（强制派遣独立 `ultracode/reviewer` 与 `ultracode/visual-evaluator` 子代理而非同上下文自评）、`/setup-models`、`/approvals` 与 `/direction`；同时注册静默 `OpencodeGoalRpc`（`opencode.goal` 返回 `null`），隐藏官方原生 Goal 胶囊且杜绝 `rpc.unavailable` 重试风暴。
  - 注册 `ctx.agent.transform`（确保原生 `build`/`plan` 保持 `hidden: true`，并在从只读 `UltraPlan` 切回 `UltraBuild` 时自动注入 `<system-update>` 解除只读限制）、`permission.evaluate`（`permissions` 为 `auto` 时放行 `ask`，显式 `deny` 始终生效）、`ultracode_model`、`ultracode_checkpoint`、`ultracode_task_graph`、`question` 工具挂起感知钩子（回答后自动恢复续跑、取消时暂停等待用户回复且用户 `prompt` 绝不误删活动 `/goal`）、中断/重启状态转 `paused` 以及压缩后 `<ultracode_goal_anchor>` 自动重注（最多 `60` 轮续跑、连续 `3` 次停滞或相同门禁阻塞自动熔断暂停）。
- **TUI 入口（`tui.tsx`，ID `ultracode-conversation-ui`）**：
  - 在命令面板（`UltraCode` 分组）注册双开关及目标 `Pause / Resume Goal`、`Clear Goal` 动作，并在底部状态栏实时反映当前会话 Goal 轮次与状态。
- **GUI 入口（`gui-experimental.cjs`，由 `packages/plugin-gui/` 基于 `@opencode/plugin@2.4.1` 与 Vite 预编译为单文件 CJS 并内嵌至二进制）**：
  - 在 OpenCode Desktop 界面提供输入框上方的 **UltraCode** `ComposerPill`（两行一键切换开关，且当当前会话存在活动/已暂停/已完成 Goal 或里程碑时动态展示轮次徽标、目标摘要及一键 **暂停 / 继续 / 清除** 动作）、独立的 **Settings → UltraCode** 页面（`SettingsLayout` + 双 `Switch`）以及命令面板动作，支持联合国 6 种官方语言（`en` / `zh` / `ar` / `fr` / `ru` / `es`）。

模式状态原子持久化至 `$ULTRACODE_HOME/permissions.mode` 与 `$ULTRACODE_HOME/direction.mode`（Linux/macOS 默认 `~/.local/share/ultracode`，Windows 默认 `%LOCALAPPDATA%\ultracode`）。

## 4. 统一 CLI 与分发模块

```text
                       ultracode CLI 路由
   内置命令：apply/sync | doctor | setup-models | upgrade/update/up | desktop | ralph | _mcp | uninstall | version | help
   其余全部参数 / 路径 / 子命令（如 pair、run、mcp list、models 等）→ 直接透传至官方 opencode
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
  Install & Config        OpenCode & Desktop       Runtime & Ralph
  最大并集 JSONC / 清单     零前置安装升级 / 桌面启动   Bun fetch / 浏览器 / TS Ralph
```

- **零前置 OpenCode 管理与动态契约校验（`opencode.ts`、`components.ts`、`packages/config/upstream-baseline.json`、`install.sh`、`install.ps1`）**：自动查找官方 `opencode`；缺失时通过官方渠道安装（Linux/macOS 官方安装脚本，Windows 官方独立 zip 包写入 `%LOCALAPPDATA%\opencode\bin` 并加入用户 `PATH`）；存在时静默尝试 `opencode upgrade`，若离线或包管理器接管导致升级返回非零但现有版本满足 V2 契约底线（`>= 2.3.2` 且 `< 3.0.0`，已验证 `v2.4.0+`），无警告平稳保留并由运行期 `apply` / `doctor` 实机契约检查兜底；`components.ts` 在读取 `/api/plugin` 时提供有界轮询重试以兼容 OpenCode `v2.4+` 后台异步插件加载。
- **Windows 原生一等公民（`paths.ts`、`fs.ts`、`release.ts`、`ralph.ts`）**：所有网络下载使用 Bun 原生 `fetch()` + SHA-256 校验；Windows 下通过重命名运行中 `.exe` 为 `.old` 实现无锁自更新与卸载清理；`ultracode ralph run` 使用纯 TypeScript 实现 linked worktree 守卫、默认 `50` 轮迭代、`--max-iterations` / `-n` 去重、`--worktree <name>` 自动创建/复用关联工作树与 `--init` 契约脚手架初始化，不依赖 bash；托管 Playwright MCP 使用内部命令 `[paths.binary, "_mcp"]`，避免遮蔽 `ultracode mcp <subcommand>` 透传。

## 5. 最大并集合并与精确卸载

- JSONC 注释、未知字段、已有 Provider、Model、MCP、Skill 原样保留；对象递归补键，数组去重追加，标量冲突保留用户值并提示。
- 清单（schema v2）记录安装器新增配置路径与受管文件 SHA-256；本地修改过的受管文件在同步与卸载时均受保护不被覆盖或误删。

## 6. 网站与 6 平台构建发布

`website/` 使用 Astro Starlight 构建覆盖联合国 6 种官方语言（默认根路径 `/` 为英文 `en`，以及 `/zh/`、`/ar/` RTL、`/fr/`、`/ru/`、`/es/`）的多语言官网与文档站点，`sync-content.mjs` 将 `scripts/install.sh` 与 `scripts/install.ps1` 同步至 `website/public/` 并自动构建 `/llms.txt` 与 `/llms-full.txt`；`scripts/generate-brand-assets.ts` 基于统一多语言文案生成 `docs/assets/{en,zh,ar,fr,ru,es}/` 下的 18 张本地化独立 SVG 图表与 `website/public/og-card*.png` 社交分享卡片，整体由 Cloudflare Workers Static Assets 发布至 `https://ultracode.plutokeating.beer/`。

`packages/installer/scripts/build.ts --release` 先构建 `packages/plugin-gui`，再由单个 Linux Runner 交叉编译 6 个目标（`linux-x64`、`linux-arm64`、`darwin-x64`、`darwin-arm64`、`windows-x64.exe`、`windows-arm64.exe`），生成 `.sha256` 与 GitHub Artifact Attestations 并发布 Release。

## 7. 上游看护体系（Upstream Stewardship）

`packages/config/upstream-baseline.json` 集中声明 4 个耦合上游（`anomalyco/opencode` 含 `@opencode/plugin` SDK、`obra/superpowers`、`@playwright/mcp`、`Th0rgal/open-ralph-wiggum`）的受支持底线、已验证版本与归档校验和：

- **方法论技能（`.opencode/skills/upstream-stewardship/`）**：不硬编码脆弱源码行号，指导本地 Coding Agent 动态扫描耦合面、按五维工程完整性量表评估上游新特性，并在隔离沙箱内完成真实验证。
- **确定性探针与金丝雀巡检（`scripts/check-upstreams.ts` + `.github/workflows/upstream-canary.yml`）**：无需任何模型 API 密钥，自动比对上游最新 Release / SDK 导出面并在隔离 `HOME` 下针对真实 `opencode` 二进制运行 GUI 编译与 `apply` + `doctor` 实机契约验证，通过单一 `upstream-sync` Issue 闭环跟踪状态。
