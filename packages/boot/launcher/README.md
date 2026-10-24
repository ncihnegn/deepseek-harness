---
description: "The reusable launcher behind a dsh application's command: argv grammar, profile boot, plugin management, config dumps, startup diagnostics, and bounded shutdown, bound to an application identity."
kind: "package-library"
---

# @deepseek-ai/dsh-launcher

English | [中文](README.zh.md)

## Summary

`dsh-launcher` is the launcher layer a dsh application's command is built from. The application supplies its name, version, installation anchor, home, environment, and shipped profile templates; this package owns the command grammar, profile composition and boot, plugin management, configuration dumps, startup diagnostics, and bounded process shutdown. `apps/cli` binds it to `dsh`, and another application reuses the same launcher by supplying its own identity instead of copying the code.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Declare a `LauncherApplication` and call `runCli` from the application's executable entry:

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

The identity fields:

| Field | Meaning |
|---|---|
| `name` | CLI name used in argv parsing, help, and every diagnostic prefix |
| `version()` | String printed by `--version`, read when the command line is parsed |
| `installAnchor` | Absolute `package.json` path that anchors profile runtime resolution |
| `home()` | Harness home for profiles, startup diagnostics, and the home patch layer; resolved per call |
| `environment()` | This invocation's frozen launch environment, read before any tree entry mounts |
| `templates` | Shipped profile templates by name |
| `defaultBundles` | Bundle list written into a first-use custom profile |
| `description`, `examples` | The launcher's own help text |
| `reservedProfile` | Profile an embedding application owns, when there is one |

The four command modes are unchanged by the parameterization: boot a profile, manage a profile's plugins, print a composed configuration, or print its JSON Schema. Every mode reads the same identity, so an application's own command cannot drift from its profile layout.

A declared `reservedProfile` is owned by an embedding application: the launcher rejects boots, resets, and dumps of it, and manages its packages only when the carrier passes `manageReservedProfile`, because that application also owns the profile's file lock and package manager.

Individual stages are exported for callers that do not run the whole command: `parseLauncherArgs`, `runProfile`, `runPlugin`, `runDumpConfig`, `runDumpConfigSchema`, `reportStartupFailure`, and `createProcessShutdown`.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Design notes

- **Identity as data.** Every product fact arrives in `LauncherApplication`; the launcher never imports shipped templates, the home resolver, or a version getter on its own.
- **Lazy mode loading.** `runCli` parses argv once and dynamically imports only the selected mode, so booting a profile never loads plugin-management or schema code.
- **Composition is owned by app-boot.** Layer precedence (bundle layers, the profile patch, the home patch, `--patch` overlays, the telemetry switch) is unchanged; this package supplies the identity and the command grammar around it.
- **Signals own teardown during startup.** `runProfile` installs SIGINT and SIGTERM handlers before the tree settles and hands them to `createProcessShutdown`, which drains for a bounded grace period and escalates on a second signal.

### Source map

| File | Role |
|---|---|
| [`src/application.ts`](src/application.ts) | `LauncherApplication`, template, and reserved-profile types |
| [`src/args.ts`](src/args.ts) | Commander grammar for profile boot, plugin management, and the dumps |
| [`src/run-cli.ts`](src/run-cli.ts) | Mode dispatch shared by an application's executable entry |
| [`src/profile-boot.ts`](src/profile-boot.ts) | Profile preparation, composition, boot, and shutdown wiring |
| [`src/plugin.ts`](src/plugin.ts) | Profile package management and exact-version approvals |
| [`src/dump-config.ts`](src/dump-config.ts), [`src/dump-config-schema.ts`](src/dump-config-schema.ts) | Boot-free configuration and schema dumps |
| [`src/startup-diagnostics.ts`](src/startup-diagnostics.ts) | Startup failure summary and saved report |
| [`src/process-shutdown.ts`](src/process-shutdown.ts) | Bounded, escalating process shutdown |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [dsh app](../../../apps/cli/README.md) — the `dsh` binding, its command modes, and its behavior reference.
- [dsh-cmdline](../cmdline/README.md) — how the booted app owns the arguments after the launcher's flags.
- [dsh-app-boot](../app-boot/README.md) — profile resolution, patch layers, and startup failure reporting.
- [dsh-plugin-manager](../plugin-manager/README.md) — the package operations `plugin` forwards to.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package resolves the process command line and composes the profile before any session exists.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **One reserved profile** — the identity declares at most one profile owned by an embedding application. A second embedding application needs a second launcher binding rather than a list here.
- **Commander grammar** — help, version, and error output follow commander's formatting, and the exit routing assumes its control-flow model.
- **Flags before app arguments** — the split is positional, so a launcher flag written after the first app token belongs to the app.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
