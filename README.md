# UltraCode

UltraCode 是官方 OpenCode 的 Provider/Model 中立增强层，提供长程工程角色、Superpowers 工程纪律、Ralph 全新上下文迭代和 Playwright 独立视觉 QA。

它不修改 OpenCode 官方二进制，不读取或配置 Provider 凭据，不在安装验收中调用真实模型。

## 一行安装

在已安装官方 OpenCode V2 的 Linux 或 macOS 上：

```bash
curl -fsSL https://project-ultracode.williamhvollita.workers.dev/install.sh | bash
```

默认安装完整链路并执行结构检查。可审查版本：

```bash
curl -fsSL https://project-ultracode.williamhvollita.workers.dev/install.sh -o /tmp/ultracode-install.sh
less /tmp/ultracode-install.sh
bash /tmp/ultracode-install.sh
```

## 常用命令

```bash
uc sync       # 幂等应用或官方升级后的修复
uc doctor     # 无真实模型调用的结构检查
uc update     # 更新 UltraCode 稳定版
uc up         # 官方 OpenCode 升级 + UltraCode 更新 + sync
uc uninstall --yes
```

## 教程网站

`website/` 使用 Astro Starlight，包含中英双语 Stable/Next 文档：

```bash
cd website
bun install
bun run dev
bun run build
```

Cloudflare Workers Connect to Git 字段见 [部署指南](docs/CLOUDFLARE.md)。

## 最大并集合并

安装器保留 JSONC 注释、未知字段、已有 Provider、Model、MCP、Skill 和 Agent。对象逐键补充，数组去重追加，冲突保留用户值并报告；本地修改的 UltraCode 文件也不会被静默覆盖或卸载。

## 开发验证

```bash
bun install --cwd installer
bun test --cwd installer
bun run --cwd installer check
bun run --cwd installer build

bun install --cwd website
bun run --cwd website check
bun run --cwd website build
```

测试使用临时 HOME 和伪 OpenCode Adapter。禁止在测试中加入真实模型调用或用户凭据。

## 发布

稳定 tag 触发 Linux/macOS x64/arm64 原生构建、版本冒烟、SHA-256、GitHub Artifact Attestations 和 Release 上传。项目采用 [MIT License](LICENSE)。

## 文档

- [架构](docs/ARCHITECTURE.md)
- [命令接口](docs/API.md)
- [快速开始](docs/QUICK_START.md)
- [Cloudflare 部署](docs/CLOUDFLARE.md)
- [社区调研](docs/RESEARCH.md)
- [历史实施与验收](docs/IMPLEMENTATION_PLAN.md)
