---
description: "dsh 应用命令背后的可复用启动器：绑定到应用身份的参数语法、profile 启动、插件管理、配置导出、启动诊断与有界关停。"
kind: "package-library"
---

# @deepseek-ai/dsh-launcher

[English](README.md) | 中文

## 概述

`dsh-launcher` 是 dsh 应用命令所构建的启动器层。应用提供自己的名称、版本、安装锚点、home、环境与随包 profile 模板；本包负责命令语法、profile 组合与启动、插件管理、配置导出、启动诊断以及有界的进程关停。`apps/cli` 把它绑定到 `dsh`，其他应用只需提供自己的身份即可复用同一个启动器，而无需复制代码。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

声明一个 `LauncherApplication`，并在应用的可执行入口中调用 `runCli`：

```ts
const application: LauncherApplication = {
  name: 'dsh',
  version: getDshRuntimeVersion,
  installAnchor: fileURLToPath(new URL('../package.json', import.meta.url)),
  home: resolveDshHome,
  environment: () => loadLayeredEnv('dsh'),
  templates: PROFILE_TEMPLATES,
  defaultBundles: DEFAULT_PROFILE_BUNDLES,
  description: 'boot a DeepSeek Harness profile',
  examples: HELP_EXAMPLES,
  reservedProfile: { name: 'desktop', initializer: 'DeepSeek Harness Desktop', manager: 'the Electron application' },
}

await runCli(application, { packageManager })
```

身份字段：

| 字段 | 含义 |
|---|---|
| `name` | 用于参数解析、帮助与每条诊断前缀的 CLI 名称 |
| `version()` | `--version` 打印的字符串，在解析命令行时读取 |
| `installAnchor` | 锚定 profile 运行时解析的绝对 `package.json` 路径 |
| `home()` | profile、启动诊断与 home 补丁层使用的 Harness home；每次调用时解析 |
| `environment()` | 本次调用的冻结启动环境，在任何树条目挂载前读取 |
| `templates` | 按名称索引的随包 profile 模板 |
| `defaultBundles` | 首次使用的自定义 profile 写入的 bundle 列表 |
| `description`、`examples` | 启动器自身的帮助文本 |
| `reservedProfile` | 嵌入应用拥有的 profile（若存在） |

参数化不会改变四种命令模式：启动 profile、管理 profile 的插件、打印组合后的配置、打印其 JSON Schema。所有模式读取同一身份，因此应用自己的命令不会与其 profile 布局脱节。

声明的 `reservedProfile` 属于某个嵌入应用：启动器拒绝对它执行启动、重置与导出，并且仅当载体传入 `manageReservedProfile` 时才管理其包，因为该应用同时拥有该 profile 的文件锁与包管理器。

不运行完整命令的调用方可以使用各个导出阶段：`parseLauncherArgs`、`runProfile`、`runPlugin`、`runDumpConfig`、`runDumpConfigSchema`、`reportStartupFailure` 与 `createProcessShutdown`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节——点击展开</summary>

### 设计说明

- **身份即数据。** 所有产品事实都通过 `LauncherApplication` 传入；启动器自身从不导入随包模板、home 解析器或版本读取器。
- **模式按需加载。** `runCli` 只解析一次参数，并动态导入所选模式，因此启动 profile 绝不会加载插件管理或 schema 代码。
- **组合由 app-boot 拥有。** 层优先级（bundle 层、profile 补丁、home 补丁、`--patch` 覆盖层、遥测开关）保持不变；本包在其外围提供身份与命令语法。
- **信号在启动期间负责收尾。** `runProfile` 在树稳定前安装 SIGINT 与 SIGTERM 处理程序，并交给 `createProcessShutdown`；后者在有界宽限期内排空，并在第二次信号时升级为强制退出。

### 源码地图

| 文件 | 作用 |
|---|---|
| [`src/application.ts`](src/application.ts) | `LauncherApplication`、模板与保留 profile 类型 |
| [`src/args.ts`](src/args.ts) | profile 启动、插件管理与配置导出的 commander 语法 |
| [`src/run-cli.ts`](src/run-cli.ts) | 应用可执行入口共用的模式分派 |
| [`src/profile-boot.ts`](src/profile-boot.ts) | profile 准备、组合、启动与关停接线 |
| [`src/plugin.ts`](src/plugin.ts) | profile 包管理与精确版本批准 |
| [`src/dump-config.ts`](src/dump-config.ts)、[`src/dump-config-schema.ts`](src/dump-config-schema.ts) | 不启动的配置导出与 schema 导出 |
| [`src/startup-diagnostics.ts`](src/startup-diagnostics.ts) | 启动失败摘要与保存的报告 |
| [`src/process-shutdown.ts`](src/process-shutdown.ts) | 有界、可升级的进程关停 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [dsh 应用](../../../apps/cli/README.zh.md)——`dsh` 绑定、其命令模式与行为参考。
- [dsh-cmdline](../cmdline/README.zh.md)——被启动的应用如何拥有启动器 flag 之后的参数。
- [dsh-app-boot](../app-boot/README.zh.md)——profile 解析、补丁层与启动失败报告。
- [dsh-plugin-manager](../plugin-manager/README.zh.md)——`plugin` 转发到的包操作。

-----

<a id="model-experience"></a>
## 模型体验

无。本包在任何会话存在之前解析进程命令行并组合 profile。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **仅一个保留 profile**——身份最多声明一个由嵌入应用拥有的 profile。第二个嵌入应用需要第二个启动器绑定，而不是在此维护列表。
- **commander 语法**——帮助、版本与错误输出遵循 commander 的格式，退出路由也假定其控制流模型。
- **flag 先于应用参数**——切分是位置性的，因此写在首个应用 token 之后的启动器 flag 属于应用。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>
