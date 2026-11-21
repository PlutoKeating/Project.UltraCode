---
title: 标准工作流
description: 计划、实现、架构咨询和独立评审
---

# 标准工作流

## 小任务

边界清晰的小任务可直接交给默认 UltraCode orchestrator。它会阅读项目约定、实施最小变更并运行项目已有检查，不会为了形式而拆出大量子代理。

## 复杂任务

先计划：

```text
/ultracode/plan 为现有系统增加导出功能，先阅读代码并给出验收条件，不要实现
```

确认范围后执行：

```text
/ultracode/work 按已确认计划执行，保持验收条件不变，运行真实检查
```

最后独立评审：

```text
/ultracode/review 审查当前 diff、原始范围和测试证据
```

## 角色职责

| 角色 | 职责 |
| --- | --- |
| orchestrator | 小任务直接执行，复杂任务维护范围和证据 |
| planner | 只规划，不实现产品代码 |
| implementer | 完成一个边界明确的实现单元 |
| architect | 只读架构、权衡和复杂调试分析 |
| reviewer | 独立审查正确性、回归和验收证据 |
| librarian | 查阅官方文档和开源实现 |
| visual-evaluator | 通过真实浏览器执行交互与视觉评审 |

## Superpowers

可显式要求使用：

- `brainstorming`：先澄清目标与方案。
- `test-driven-development`：先红后绿。
- `systematic-debugging`：先定位根因。
- `verification-before-completion`：完成前取得新证据。

## 完成标准

没有执行的检查必须标记为未验证。测试、构建和真实场景的证据优先于“看起来完成”的文字结论。
