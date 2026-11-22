# UltraCode

UltraCode 是面向官方 OpenCode V2 的 Provider/Model 中立增强层，聚焦 **Goal Engineering（目标工程）**——让用户通过自然语言定义受众、目标与验收标准，把长程规划、实现、独立评审与视觉自检交由 Agent 体系持续推进，原生覆盖 **macOS、Linux 与 Windows**，以及 **终端（TUI）、桌面端（Desktop）、网页端（Web）与移动端（Mobile）**。

核心能力（v0.3.0）：

- **单一命令与零前置安装**：唯一命令 `ultracode` 与 `opencode` 参数/子命令完全互通；安装脚本与 `ultracode upgrade` 自动检测并安装/升级官方 OpenCode V2。
- **全平台与全触点统一体验**：内嵌多触点 `ultracode-conversation` 插件包（Server RPC 与 `/approvals`、`/direction` 斜杠开关 + TUI 状态与命令面板 + OpenCode Desktop `ComposerPill` 与 `Settings` 页面），配合 `ultracode desktop` 与 `ultracode pair`。
- **双主角色与后台子代理**：`UltraBuild`（默认，总协调与执行）与 `UltraPlan`（规划，`Shift+Tab` 切换），配合 5 个独立后台子代理（`architect`、`implementer`、`librarian`、`reviewer`、`visual-evaluator`）。
- **对话驱动里程碑续跑与交接**：在原对话内自主推进里程碑，长任务清单、进度与交接落盘在仓库内，服务重启后可自然语言接续；内置跨平台 TypeScript 原生 `ultracode ralph run`。
- **非侵入最大并集合并**：不修改 OpenCode 官方终端或桌面二进制，不读取或配置 Provider 凭据，不在安装验收中调用真实模型。

## 一条命令安装

无需预装任何环境（若尚未安装官方 OpenCode V2，安装脚本会自动完成安装或升级）：

**macOS / Linux**：

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

**Windows（PowerShell）**：

```powershell
irm https://ultracode.plutokeating.beer/install.ps1 | iex
```

## 开始使用

```bash
ultracode           # 在当前目录启动终端界面（兼容所有 opencode 参数与子命令）
ultracode desktop   # 启动官方桌面客户端，未安装时自动下载官方安装包
ultracode pair      # 生成一次性链接与二维码，连接浏览器或手机端
```

- **主角色切换**：默认进入 `UltraBuild`（总协调与执行）；按 `Shift+Tab` 切换至 `UltraPlan`（只读规划）。
- **跨端实时开关**：在 OpenCode Desktop 点击输入框上方的 **UltraCode** 胶囊（或打开 **Settings → UltraCode**），在 TUI 命令面板搜索 **UltraCode**，或在网页/手机端输入 `/approvals`、`/direction`，即可实时切换 **Command approvals**（默认 `auto`）与 **Direction questions**（默认 `manual`）。

## 常用维护命令

```bash
ultracode upgrade          # 更新官方 OpenCode 与 UltraCode 并同步配置
ultracode sync             # 幂等同步配置与受管运行时
ultracode doctor           # 零模型调用健康检查
ultracode ralph run ...    # 在 linked worktree 中运行跨平台 Ralph 循环
ultracode uninstall --yes  # 干净卸载 UltraCode（保留用户配置与备份）
```

## 开发验证

```bash
bun install --cwd plugin-gui
bun run --cwd plugin-gui check
bun run --cwd plugin-gui build

bun install --cwd installer
bun test --cwd installer
bun run --cwd installer check
bun run --cwd installer build

bun install --cwd website
bun run --cwd website check
bun run --cwd website build
```

测试使用临时目录与隔离桩程序，禁止在测试中加入真实模型调用或用户凭据。

## 发布

为稳定 tag 手动触发 Release 工作流，单 Linux runner 交叉构建 6 个平台目标（`linux`/`darwin`/`windows` × `x64`/`arm64`）、版本冒烟、SHA-256、GitHub Artifact Attestations 与 Release 上传。项目采用 [MIT License](LICENSE)。

## 文档

- [架构](docs/ARCHITECTURE.md)
- [命令接口](docs/API.md)
- [快速开始](docs/QUICK_START.md)
- [Cloudflare 部署](docs/CLOUDFLARE.md)
- [社区调研](docs/RESEARCH.md)
- [历史实施与验收](docs/IMPLEMENTATION_PLAN.md)
