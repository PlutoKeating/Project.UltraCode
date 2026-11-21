---
title: 架构
description: 小接口、深实现和与 OpenCode 官方二进制的清晰接缝
---

# 架构

## 用户接口

```text
uc apply / sync
uc doctor
uc update
uc up
uc uninstall
```

这些命令背后隐藏平台检测、OpenCode 版本检查、备份、JSONC 合并、私有运行时、发布下载和验收。调用者不需要理解每个实现细节。

## 模块划分

- **Install 模块**：幂等应用、文件所有权和卸载。
- **Config 模块**：最大并集 JSONC 合并与精确删除。
- **Runtime 模块**：私有 Bun 能力、Ralph、Playwright 和浏览器。
- **Release 模块**：稳定版本查询、SHA-256 校验与自更新。
- **OpenCode Adapter**：只执行版本和官方升级命令，不调用模型。
- **Website 模块**：从单一内容源生成中英双语 Stable/Next 文档。

## 私有运行时

独立二进制内嵌 Bun 能力。安装器通过它安装固定版本的 Ralph 与 Playwright，不要求用户预装 Node 或 Bun，也不写用户全局包目录。

## OpenCode 接缝

UltraCode 只使用公开配置、Agent/Command/Skill 文件、官方插件入口和公开 CLI。`~/.opencode/bin/opencode` 始终由官方安装器或升级命令管理。

## Provider 中立

角色定义不包含 `model`，Ralph 不传 `--model`，配置合并不包含 `provider`。因此任何安装验收都不需要用户凭据，也不会产生模型费用。
