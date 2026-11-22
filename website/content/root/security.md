---
title: 安全与隐私
description: 无凭据读取、最小权限、制品校验和可回滚写入
---

# 安全与隐私

## Provider 凭据

安装器不读取、不复制、不打印、不测试任何 Provider 凭据。文档和 CI 也不要求用户上传 API Key、ADC 或登录信息。

## 权限范围

- 用户级 XDG 目录，无 sudo。
- 不修改官方 OpenCode 二进制。
- 视觉评审无 shell。
- 普通对话的权限审批默认 auto，可在命令面板切为 manual。
- 不自动 push 或合并受保护分支。

## 发布完整性

Release 为每个平台提供：

- 独立二进制。
- SHA-256 文件。
- GitHub Artifact Attestations 构建来源证明。

校验和验证下载完整性；来源证明记录构建出处。生产环境仍建议先审查安装脚本和 Release。

## 写入安全

配置文件采用原子替换；写入前备份；清单记录 UltraCode 所有文件哈希。卸载只删除与清单一致的文件，本地修改会被保留。

## 第三方依赖

Superpowers 与 Ralph 使用固定源码归档和 SHA-256；Playwright 使用固定 npm 版本。更新锁定值需要新的 UltraCode 稳定 Release，而不是在 apply 时跟踪上游 main。

## 文档安全

教程不会要求用户把真实凭据贴进 issue、日志或网页。公开故障报告应先脱敏路径、令牌和私有项目标识。
