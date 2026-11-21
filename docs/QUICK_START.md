# 快速开始

当前文档覆盖已经完成的大步骤 1–4。独立视觉 QA 仍需按实施计划安装和验收。

## 1. 前置条件

- OpenCode `v2.3.2`
- 已安装并登录 `gcloud`
- 已为当前用户配置 Vertex Application Default Credentials
- 当前 GCP 项目已启用所需 Gemini 4 模型
- Node.js 20+、Git

检查：

```bash
opencode --version
gcloud auth list
gcloud config get-value project
```

不要在仓库中写入 ADC JSON、访问令牌或 API Key。

## 2. Vertex 配置

全局配置位于 `~/.config/opencode/opencode.jsonc`。将以下公共字段合并进现有配置，不要覆盖已有 Provider 或 MCP：

```jsonc
{
  "model": "google-vertex/gemini-4-neon",
  "providers": {
    "google-vertex": {
      "settings": {
        "project": "{env:GOOGLE_CLOUD_PROJECT}",
        "location": "global"
      }
    }
  }
}
```

也可以把实际项目 ID 只写入本机全局配置。Gemini 4 使用 `global` 区域；`us-central1` 可能对部分新模型返回模型不存在或项目无权限。

## 3. 验证真实调用

```bash
export GOOGLE_CLOUD_PROJECT="<你的 GCP 项目 ID>"
opencode run --standalone \
  --model google-vertex/gemini-4-neon \
  --agent plan \
  "只回复 VERTEX_NEON_OK，不要调用任何工具。"
```

预期输出：

```text
VERTEX_NEON_OK
```

该测试只使用 Vertex Gemini，不验证也不使用其他 Provider。

## 4. 验证现有 MCP 与配置

```bash
opencode debug config
opencode mcp list
```

本机基线应显示 REA 为 `connected`。配置迁移后仍需保留用户已有命令、技能和 Provider，示例文件不能作为整文件替换。

## 5. 回滚

升级前的公共配置备份位于本机 `~/.config/opencode/backups/` 下对应时间戳目录。回滚时先停止相关 OpenCode 会话，再恢复 `opencode.jsonc` 和包清单；不要用备份覆盖后续新增但未备份的工作。

OpenCode 本身可通过内置命令安装指定版本：

```bash
opencode upgrade 2.2.7
```

降级后应重新验证模型、插件与 MCP；如果新插件要求 V2.3.x，应先移除或禁用对应插件。

## 6. 使用原生角色

仓库 `config/opencode/agents/` 和 `config/opencode/commands/` 已同步到全局 OpenCode 配置。典型用法：

```text
/ultracode-plan 为现有命令行工具增加本地 JSON 持久化，先给计划不要实现
/ultracode-work 按刚才确认的计划执行，并完成真实验证
/ultracode-review 审查当前 diff 和验收条件
```

也可以直接运行：

```bash
opencode run --standalone --agent orchestrator "完成一个边界明确的小任务"
opencode run --standalone --agent architect "只读分析当前架构的主要风险"
```

`orchestrator` 只在任务复杂时委派；`planner` 不实现产品代码；`reviewer` 和 `visual-evaluator` 不修改实现。Playwright 视觉评审在步骤 5 配置后可用。

## 7. 使用 Superpowers

当前固定安装 `superpowers@v7.0.2`。在 `orchestrator` 或其他适合的会话中明确请求：

```text
使用 brainstorming 技能澄清这个需求，先不要实现
使用 test-driven-development 技能完成这个边界明确的任务
使用 systematic-debugging 技能定位这个失败测试的根因
```

代理应实际调用 `skill` 工具，而不是只在回复中提及技能名称。Superpowers 不替代 `/ultracode-plan` 和独立 reviewer。

## 8. 启动 Ralph 长跑

先创建独立 worktree，并准备目标文件和 `.ralph/ralph-tasks.md`：

```bash
git worktree add -b feature/my-long-task ../my-long-task
cd ../my-long-task
mkdir -p .ralph
cp ~/.config/opencode/ralph/templates/PROGRESS.md .ralph/
cp ~/.config/opencode/ralph/templates/HANDOFF.md .ralph/
```

需要结构化功能验收时，再把 `FEATURE_LIST.json` 和 `SPRINT_CONTRACT.md` 复制到 `.opencode/ultracode/` 并填写。启动：

```bash
~/.config/opencode/ralph/run.sh <目标文件> 20 --no-questions
```

默认不自动放权。确认 worktree、权限和任务边界后，无人值守运行可显式追加 `--allow-all`。每轮只做一个顶层任务；阻塞原因为 `.ralph/HANDOFF.md` 中的文本，退出信号必须保持 `<promise>BLOCKED</promise>`。

卸载 Ralph：

```bash
bun remove -g @th0rgal/ralph-wiggum
```

## 9. 后续步骤

独立视觉 QA 尚未安装。继续前请查阅 [实施计划](IMPLEMENTATION_PLAN.md)，大步骤 5 仍需单独审批与验收。
