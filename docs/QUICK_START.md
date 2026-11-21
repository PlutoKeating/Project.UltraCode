# 快速开始

## 1. 前置条件

- Linux/macOS x64 或 arm64。
- 官方 OpenCode V2.3.0+。
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

## 4. 工作流

```text
/ultracode/plan 先给出带验收条件的计划，不要实现
/ultracode/work 按确认计划实施并运行真实检查
/ultracode/review 独立审查当前 diff 和证据
```

## 5. Ralph 长跑

```bash
git worktree add -b feature/my-task ../my-task
cd ../my-task
mkdir -p .ralph
cp ~/.config/opencode/ultracode/templates/PROGRESS.md .ralph/
cp ~/.config/opencode/ultracode/templates/HANDOFF.md .ralph/
```

准备 `.ralph/ralph-tasks.md` 和目标文件后：

```bash
~/.config/opencode/ultracode/run.sh GOAL.md 20 --no-questions
```

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
