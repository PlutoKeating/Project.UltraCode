# UltraCode 架构

## 1. 目标

UltraCode 解决两类问题：长程工程中的目标漂移、上下文腐烂与自评宽容；以及增强链路在新机、已有复杂配置和 OpenCode 官方升级后的可重复安装。

核心约束：Provider/Model 中立，不读取凭据，不做真实模型安装测试，不侵入官方二进制。

## 2. 长程工作流

```text
用户目标 / Spec
  → Superpowers：澄清、TDD、系统化调试
  → OpenCode 原生 Planner / Architect
  → Implementer / 原生后台子代理
  → 独立 Reviewer / Visual Evaluator
  → Ralph 外层全新 opencode run
  → Git、任务、Progress、Handoff 持久化
```

子代理隔离会话内上下文，Ralph 在顶层迭代之间创建新会话。二者不可互相替代。

所有角色不包含 `model`，Ralph 不传 `--model`。用户当前 OpenCode 会话决定实际 Provider 与模型。

## 3. 分发模块与接口

```text
                  小接口
        apply / sync / doctor / update / up / uninstall
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
 Install Module     Config Module      Release Module
 文件所有权/卸载     最大并集 JSONC       稳定版本/SHA256
      │                  │                  │
 Runtime Module     OpenCode Adapter    Website Module
 私有运行时/浏览器   版本/官方升级        Stable/Next 双语站点
```

接口只暴露调用者需要的操作；平台、路径、备份、锁版本、原子写入和验收属于内部实现。

## 4. 最大并集合并

- 对象递归补缺失键。
- 数组按值去重追加，避免重复权限和插件。
- 已有不同标量保留并报告。
- JSONC 注释、未知字段、Provider、凭据引用和用户 MCP 原样保留。
- Agent、Command、MCP 使用 UltraCode 命名空间。
- 清单哈希区分上游旧文件与用户本地修改。
- 卸载仅精确删除未修改的 UltraCode 所有状态。

## 5. 私有运行时

独立编译 CLI 内嵌 Bun 能力。安装器以子进程方式使用同一二进制安装固定版本 Ralph 与 Playwright，无需用户预装 Node/Bun，也不写全局包目录。

Superpowers 与 Ralph 的固定源码归档具有 SHA-256；Playwright 使用精确 npm 版本。浏览器存入 UltraCode 数据目录。

## 6. 官方升级接缝

OpenCode 二进制只由官方安装脚本或 `opencode upgrade` 管理。

- `uc up`：显式执行官方升级，再更新 UltraCode 并 sync。
- `uc sync`：官方 `/update` 或安装脚本后的幂等修复。
- `uc doctor`：结构、版本、文件和运行时检查，不调用模型。

当前测试基线为 OpenCode V2.3.x；更新的 V2 只承诺结构检查，未来大版本需要显式适配。

## 7. 网站与发布

Astro Starlight 从单一内容源生成中文/英文 Stable/Next 路由，并把根 `install.sh` 复制到静态站点。Cloudflare Workers Static Assets 发布 `website/dist`。

稳定 Release 在 Linux/macOS x64/arm64 原生 Runner 构建，执行版本冒烟，生成 SHA-256 与 Artifact Attestations。CI 不使用真实模型、用户凭据或 Docker。
