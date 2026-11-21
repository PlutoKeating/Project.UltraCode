---
title: 开发与发布
description: 本地测试、文档生成、稳定 Release 和供应链流程
---

# 开发与发布

## 安装依赖

```bash
bun install --cwd installer
bun install --cwd website
```

## 安装器检查

```bash
cd installer
bun test
bun run check
bun run build
./dist/ultracode-current version
```

所有测试使用临时 HOME 和伪 OpenCode，不得添加真实模型调用。

## 网站检查

```bash
cd website
bun run check
bun run build
```

`sync-content.mjs` 从 `content/root` 与 `content/en` 生成 Stable/Next 路由，并复制根安装脚本。不要提交生成的 `src/content/docs`。

## Release

1. 合并经过验证的变更到 main。
2. 审查版本号、CHANGELOG 和发布说明。
3. 创建稳定 tag 与 GitHub Release。
4. Release 触发四平台构建、SHA-256、来源证明和制品上传。
5. 在一个干净环境执行固定版本安装与重复 sync。

## 依赖升级

不要直接改到 latest。先更新锁定版本，运行隔离测试、Release 构建和网站构建，再通过稳定 tag 发布。

## 文档贡献

中英文页面保持相同信息结构。修改安装命令时同时更新根 `install.sh`、参考文档和中英教程，避免示例与实际行为漂移。
