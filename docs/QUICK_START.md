# 快速开始

## 1. 前置条件

- Linux/macOS x64 或 arm64。
- 官方 OpenCode V2.3.2+。
- `curl`、`tar` 和网络。
- 用户目录可写，无 sudo。

```bash
opencode --version
```

## 2. 一行安装

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

安装器不读取 Provider 凭据，不设置模型，不调用真实模型。完整链路包含私有 Ralph、Playwright 和浏览器。

固定 Release：

```bash
export ULTRACODE_VERSION=v0.2.2
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

## 3. 验证

```bash
uc version
uc doctor
```

检查当前项目的插件、角色和 MCP 注册，不调用模型。Provider 或模型问题仍由 OpenCode 自身配置负责。

## 4. 日常使用

打开项目目录，运行 `opencode`，直接用自然语言描述受众、目标和验收条件，可随时补充要求或叫停。

- **双主角色与 5 个后台子代理**：默认进入 `UltraBuild`（总协调与执行），按 `Shift+Tab` 可切换为 `UltraPlan`（先澄清与规划）。模型会按需派遣后台子代理（`architect`、`implementer`、`librarian`、`reviewer`、`visual-evaluator`）并登记下一里程碑，在原对话持续推进。
- **长任务交接**：长期任务的清单、进度与交接保存在仓库内（`.ralph/` 或项目既有约定），服务重启后直接说“读取交接并继续”即可恢复。
- **TUI 命令面板**：搜索 **UltraCode**，可独立切换 **Command approvals**（默认 `auto`，自动放行宿主原本需要询问的操作，显式 `deny` 仍然生效）和 **Direction questions**（默认 `manual`）。

### 最小体验示例（一句话建站并视觉自检）

在空目录初始化 Git 并运行 `opencode` 后，直接发送一句话目标：

> “帮我做一个本地离线可用的极简番茄钟网页，面向专注写代码的开发者，包含 25/5 分钟切换、开始/暂停/重置和桌面+移动端自适应；完成后启动本地预览，实际点击所有按钮并用 Playwright 截图做独立视觉检查，确认零控制台报错且界面无溢出后再交给我。”

`UltraBuild` 会自动规划实现、派遣 `implementer` 编写代码，再由独立的 `visual-evaluator` 通过 Playwright 操作页面并目视验收渲染结果，最后把可运行页面与验收结论交回给你。

## 5. 官方升级后

一体化升级：

```bash
uc up
```

或继续使用官方 `/update`、CLI、安装脚本，然后：

```bash
uc sync
```

## 6. 卸载

```bash
uc uninstall --yes
```

保留用户配置、其他 MCP/Provider、本地修改和备份。

完整中英教程见 `website/`；Cloudflare 字段见 [部署指南](CLOUDFLARE.md)。
