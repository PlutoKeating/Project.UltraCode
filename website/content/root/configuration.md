---
title: 最大并集配置
description: 保留注释、未知字段、已有 MCP 和用户选择
---

# 最大并集配置

UltraCode 把用户的 `opencode.json(c)` 视为拥有自己的文档，而不是可覆盖模板。

## 合并规则

- 缺失对象逐键补充。
- 缺失数组成员逐项追加并去重。
- 已有标量与 UltraCode 不同时保留用户值并报告。
- 注释、Provider、凭据引用和未知字段原样保留。
- 已有 `default_agent` 不会被替换。
- 用户自己的 MCP、Skill 和 Agent 不进入 UltraCode 清单。

## 命名空间

角色位于 `agents/ultracode/`，命令位于 `commands/ultracode/`，MCP 使用 `ultracode_playwright`。这降低了与用户现有定义冲突的概率。

## 冲突示例

如果用户已有：

```jsonc
{
  // 我的默认角色
  "default_agent": "my-agent"
}
```

安装器会保留 `my-agent`，报告 `default_agent` 冲突，同时安装 UltraCode 角色。用户仍可显式调用 UltraCode 角色。

## 本地修改

已被用户修改的 UltraCode Agent 在后续 apply 和卸载时都会保留。安装器通过安装清单中的哈希区分“上游旧版本”和“用户本地修改”。

## 备份

每次实际写入前都会把原文件备份到 UltraCode 数据目录。回滚应先使用 `uc uninstall --yes`，再按时间戳检查备份，避免覆盖卸载之后的新修改。
