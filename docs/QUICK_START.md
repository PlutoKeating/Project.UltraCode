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
export ULTRACODE_VERSION=v0.1.0
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

## 3. 验证

```bash
uc version
uc doctor
```

没有真实模型调用的结构检查通过即可。Provider 或模型问题仍由 OpenCode 自身配置负责。

## 4. 日常使用

打开项目目录，运行 `opencode`，直接描述受众、目标和验收条件。可以随时补充要求或叫停。模型按需要派遣子代理、记录下一里程碑，在原对话继续。长期任务的清单、进度和交接保存在仓库内。服务重启后可要求“读取交接并继续”。

打开 TUI 命令面板，搜索 **UltraCode**，可独立切换 **Command approvals**（默认 auto）和 **Direction questions**（默认 manual）。权限 auto 自动放行宿主原本需要询问的操作，显式 deny 仍然生效。

## 6. 官方升级后

一体化升级：

```bash
uc up
```

或继续使用官方 `/update`、CLI、安装脚本，然后：

```bash
uc sync
```

## 7. 卸载

```bash
uc uninstall --yes
```

保留用户配置、其他 MCP/Provider、本地修改和备份。

完整中英教程见 `website/`；Cloudflare 字段见 [部署指南](CLOUDFLARE.md)。
