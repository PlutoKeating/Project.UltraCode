---
title: 升级与修复
description: 保留 OpenCode 官方入口，并用短命令完成同步
---

# 升级与修复

## 最省事的一体化升级

```bash
uc up
```

它依次执行官方 `opencode upgrade`、更新 UltraCode 到稳定 Release，并幂等应用配置。只有用户显式执行该命令时才会升级 OpenCode。

## 继续使用官方入口

官方 TUI `/update`、CLI 和安装脚本不受 UltraCode 影响：

```bash
opencode upgrade
curl -fsSL https://opencode.ai/v2/install | bash
```

完成后执行：

```bash
uc sync
```

这会补回缺失文件、合并新增配置并修复私有运行时，不需要输入冗长命令。

## 只更新 UltraCode

```bash
uc update
```

该命令不升级 OpenCode。

## 检查

```bash
uc doctor
opencode --version
```

`doctor` 只检查结构、版本、文件和运行时，不调用模型。

## 兼容策略

当前支持 OpenCode V2.3.x，并对更新的 V2 版本执行结构检查。新大版本或插件接口变化需要新的兼容适配与 Release，不能承诺未发布版本天然兼容。

## 回滚顺序

1. 必要时通过官方入口恢复 OpenCode 版本。
2. 固定 UltraCode Release 后重新执行安装器或 `uc sync`。
3. 仍有问题时执行 `uc uninstall --yes`。
4. 最后才按时间戳恢复备份，避免覆盖新修改。
