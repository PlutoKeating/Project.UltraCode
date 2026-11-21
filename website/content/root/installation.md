---
title: 安装与卸载
description: 安装路径、私有运行时、重复安装和安全卸载
---

# 安装与卸载

## 默认路径

| 路径 | 内容 |
| --- | --- |
| `~/.local/bin/ultracode` | 独立 CLI |
| `~/.local/bin/uc` | 短命令符号链接 |
| `~/.local/share/ultracode/` | 清单、备份、私有运行时和浏览器 |
| `~/.config/opencode/agents/ultracode/` | 命名空间隔离的角色 |
| `~/.config/opencode/commands/ultracode/` | UltraCode 命令 |
| `~/.config/opencode/ultracode/` | Ralph 协议与模板 |

自定义 XDG 目录时，安装器遵循 `XDG_DATA_HOME`、`XDG_CONFIG_HOME`、`OPENCODE_CONFIG_DIR` 和 `ULTRACODE_HOME`。

## 重复安装

```bash
uc sync
```

`sync` 是幂等的：相同内容不会重复写入，相同数组成员不会重复追加。它也会在官方 OpenCode 更新后修复缺失的 UltraCode 状态。

## 固定版本

```bash
export ULTRACODE_VERSION=v0.1.0
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

稳定生产环境建议固定版本，在测试环境验证后再提升。

## 可审查下载

不希望直接执行管道脚本时：

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh -o /tmp/ultracode-install.sh
less /tmp/ultracode-install.sh
bash /tmp/ultracode-install.sh
```

Release 中的每个平台二进制均有 `.sha256` 文件和 GitHub 构建来源证明。

## 卸载

```bash
uc uninstall --yes
```

只删除未被用户修改的 UltraCode 所有文件和精确配置项。用户配置、被修改的 Agent、其他 MCP/Provider 与备份均保留。
