---
title: 独立视觉 QA
description: Playwright、UI Rubric、截图证据和不可伪造的未验证状态
---

# 独立视觉 QA

## 独立性

视觉评审者不是实现者。它通过独立 Playwright MCP 操作真实页面，不能调用 shell，通用编辑工具也被拒绝。

## 默认 Rubric

默认文件：

```text
~/.config/opencode/ultracode/templates/UI_RUBRIC.md
```

项目可在 `.opencode/ultracode/UI_RUBRIC.md` 中覆盖。

评分维度：设计统一性、原创性、工艺、功能可用性。核心流程失败、必需检查未执行、横向溢出或主操作不可达都会触发 REJECT。

## 调用

```bash
opencode run --agent ultracode/visual-evaluator \
  "读取 Sprint Contract 和适用的 UI Rubric，通过 Playwright 操作 http://127.0.0.1:3000，保存桌面和移动截图并写 QA_REPORT.md"
```

如果角色 ID 与当前 OpenCode 版本显示不同，以 `opencode debug agents` 为准。

## 证据目录

自动浏览器输出写入：

```text
.opencode/ultracode/qa/
```

Ralph 启动器为该目录创建忽略规则。QA 报告可提交，截图和临时浏览器输出默认不提交。

## 验收矩阵

每项标准必须是：

- `PASS`：实际执行且符合标准。
- `FAIL`：实际执行且不符合标准。
- `NOT_VERIFIED`：没有执行或证据不足。

必需项的 `NOT_VERIFIED` 不能被高分抵消。

## 浏览器安装

完整安装已下载匹配浏览器。若缓存被删除，重新运行：

```bash
uc sync
```

无需用户自行安装 Node、Bun 或全局 Playwright。
