# 快速开始

当前文档只覆盖已经完成的大步骤 1。后续增强功能需按实施计划逐步安装，不能仅凭本目录中的规划直接调用。

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

## 6. 后续步骤

OMO、Superpowers、Ralph 和独立视觉 QA 尚未在本步安装。继续前请查阅 [实施计划](IMPLEMENTATION_PLAN.md)，每个大步骤都需要单独审批与验收。
