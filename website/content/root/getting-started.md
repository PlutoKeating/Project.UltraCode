---
title: 快速开始
description: 在已安装官方 OpenCode V2 的 Linux 或 macOS 上完成安装
---

# 快速开始

## 前置条件

- Linux x64/arm64 或 macOS x64/arm64。
- 官方 OpenCode V2.3.2 或更新版本。
- `curl`、 `tar` 和可用的网络连接。
- 用户主目录可写，不需要 sudo。

检查 OpenCode：

```bash
opencode --version
```

## 一行安装

将示例域名替换为实际发布地址：

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

默认安装完整角色、Superpowers、Ralph 和 Playwright。安装器会：

1. 下载匹配平台的独立 `ultracode` 二进制。
2. 校验 Release SHA-256。
3. 安装私有运行时与匹配浏览器。
4. 以最大并集方式合并 OpenCode 配置。
5. 执行不含真实模型调用的结构检查。

## 验证

```bash
uc version
uc doctor
```

打开新的 OpenCode 会话后，可使用：

```text
为一个功能制定计划
按确认的范围执行
独立审查当前变更
```

直接描述目标即可。

## 不修改模型的含义

安装器不会写入 `model`、`provider`、`apiKey` 或任何认证字段。角色继承当前会话模型。你只需要像安装前一样使用 OpenCode 的模型选择入口。
