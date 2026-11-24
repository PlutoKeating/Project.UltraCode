# Changelog

## v1.1.1 - 2026-11-24

上游基线对齐与多触点会话运行时稳定性补丁版本（Verified on OpenCode v2.4.1）：

- **OpenCode `v2.4.1` 与 Ralph `7559f26` 上游对齐**：将 `packages/config/upstream-baseline.json` 与 `packages/plugin-gui` 升级至 OpenCode `v2.4.1`（`@opencode/plugin@2.4.1`）及 `Th0rgal/open-ralph-wiggum` 最新主线提交 `7559f267b227d74d82776048697615536c2a6b2a`（支持可选 `--task-min-iterations` 等改进，完全兼容 `--agent opencode`），并通过实机隔离金丝雀校验。
- **`ultracode-conversation` 与 Desktop GUI 稳定性加固**：加固 `OpencodeGoalRpc` 事件监听与官方 `/goal` 避让逻辑、修复重复里程碑停滞状态保留，并修正 OpenCode Desktop 路由下的会话上下文识别。
- **跨平台测试修复**：修复 Windows `cmd.exe` 下重定向解析引发的测试稳定性问题。

## v1.1.0 - 2026-11-24

面向 OpenCode `v2.4.0+` 的全面对齐、持久化里程碑加固与上游看护体系版本（Built with UltraCode v1.0.0 / Verified on OpenCode v2.4.0）：

- **OpenCode `v2.4.0+` 全面对齐与异步插件就绪重试**：新增单一声明式上游基线 `packages/config/upstream-baseline.json`；`packages/plugin-gui` 升级至 `@opencode/plugin@2.4.0`；移除 `opencode.ts` 中针对 `minor > 3` 的误导性静态警告，改为基于 V2 契约底线（`>= 2.3.2` 且 `< 3.0.0`）加运行期实机契约校验；`components.ts` 针对 OpenCode `v2.4+` 后台异步加载插件机制新增有界轮询重试，消除冷启动去重竞态。
- **持久化 `ultracode_checkpoint`、官方 `/goal` 共存与桌面胶囊清除控制**：会话里程碑升级为 `ctx.storage` 持久化存储，新增进程启动围栏（`BOOT_ID` fencing）、单轮用户授权最多 25 次自动续跑与连续 3 次重复里程碑停滞熔断保护，并在检测到同一会话激活官方 `opencode.goal`（`/goal`）时自动让出续跑控制权；`UltraCodeRpc` 新增 `clearCheckpoint` 与活动里程碑映射，OpenCode Desktop 输入框上方的 `UltraCode` 胶囊在会话存在待执行里程碑时动态展示第 3 行摘要与一键清除按钮（完整覆盖联合国 6 种官方语言）。
- **零路径硬编码上游看护体系（Upstream Stewardship）**：新增 `.opencode/skills/upstream-stewardship/` 方法论技能与五维完整性门控量表，配套零 Token 确定性上游探针与隔离实机金丝雀脚本 `scripts/check-upstreams.ts`（`--verify-live`）及 `.github/workflows/upstream-canary.yml` 每日巡检工作流，通过单一去重 GitHub Issue 自动跟踪上游变更与兼容性状态（零代码写入权限、零模型调用）。

## v1.0.0 - 2026-11-23

首个正式版（Built with UltraCode v0.3.0）：

- **正式版 v1.0.0 与仓库架构收敛**：核心运行时包统一收敛至 `packages/`（`packages/installer`、`packages/plugin-gui`、`packages/config`），安装脚本归入 `scripts/`，设计规范与历史记录归入 `docs/`，根目录结构清晰直观。
- **联合国 6 大官方语言全面覆盖**：仓库根目录提供英（`README.md`）、中（`README_ZH.md`）、阿（`README_AR.md`）、法（`README_FR.md`）、俄（`README_RU.md`）、西（`README_ES.md`）6 语文档；生产官网 `https://ultracode.plutokeating.beer` 切换默认根路径 `/` 为国际通用英文，并完整覆盖 `/zh/`、`/ar/`（原生 RTL 右向排版）、`/fr/`、`/ru/`、`/es/` 首页与全部上手文档。
- **全套 SEO / AEO / GEO 搜索与生成式引擎优化**：补齐自引用 `canonical`、6 语言双向 `hreflang` + `x-default`、OpenGraph / Twitter 分享大图卡片、Schema.org `JSON-LD` 结构化实体图谱（`SoftwareApplication` / `WebSite` / `Organization` / `TechArticle` / `BreadcrumbList` / `FAQPage`）、放行主流 AI 检索爬虫的 `robots.txt`，以及构建期自动同步生成的 `/llms.txt` 与 `/llms-full.txt`。

## v0.3.0 - 2026-11-23

统一为单一命令 `ultracode` 的全平台、全触点版本：

- **单一命令与零前置安装**：全面统一为 `ultracode`（移除旧短命令与历史迁移包袱），完整透传所有 `opencode` 参数与子命令；`install.sh`、`install.ps1` 与 `ultracode upgrade` 自动检测并安装/更新官方 OpenCode V2，采用极简进度与就绪输出。
- **Windows 原生一等公民**：新增 `windows-x64` 与 `windows-arm64` 原生独立编译二进制、PowerShell 一键安装脚本 `install.ps1`、Windows 原生路径/无锁替换，以及跨平台 TypeScript 原生 `ultracode ralph run`。
- **OpenCode 全触点插件与桌面启动器**：`ultracode-conversation` 升级为 Server RPC（及面向 Web/Mobile 的零模型调用 `/approvals`、`/direction` 开关命令）+ TUI + OpenCode Desktop GUI（`./gui-experimental`，提供输入框上方 `UltraCode` 胶囊开关与独立 `Settings → UltraCode` 页面）一体化插件包，多端状态实时同步；新增 `ultracode desktop` 启动或下载官方桌面客户端。

## v0.2.2

主角色定名为 UltraBuild（默认执行与协调）和 UltraPlan（规划）。升级会迁移未修改的托管旧角色与对应的默认选择。

## v0.2.1

修复已有插件、MCP、权限及托管文件的身份与所有权冲突。安装验收读取宿主活动状态；升级后由新二进制执行同步。

## v0.2.0

普通对话支持模型自主安排里程碑、后台子任务和独立评审。TUI 提供独立的权限审批与方向询问开关。稳定包在一个 Linux runner 交叉编译四个平台并生成 SHA-256。

## v0.1.0 - 2026-11-22

First stable release.
