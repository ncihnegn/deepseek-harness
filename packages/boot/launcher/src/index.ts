/**
 * `@deepseek-ai/dsh-launcher` — the reusable launcher layer behind a dsh
 * application's command.
 *
 * An application supplies its identity, shipped profile templates, and
 * environment; this package owns the argv grammar, profile composition and
 * boot, plugin management, config dumps, startup diagnostics, and bounded
 * shutdown. `apps/cli` binds it to `dsh`; another application binds it to its
 * own name without forking the launcher.
 * @module @deepseek-ai/dsh-launcher
 */

export type {
  LauncherApplication,
  LauncherProfileTemplate,
  ReservedProfileApplication,
} from './application.ts'
export { parseLauncherArgs, type LauncherInvocation } from './args.ts'
export { collectConfigDumpLayers, runDumpConfig } from './dump-config.ts'
export { runDumpConfigSchema } from './dump-config-schema.ts'
export { runPlugin } from './plugin.ts'
export {
  createProcessShutdown,
  PROCESS_SHUTDOWN_TIMEOUT_MS,
  type ProcessShutdown,
} from './process-shutdown.ts'
export {
  homePatchPath,
  initializeProfileFromDefault,
  prepareProfile,
  PROFILE_ROOT_FILENAME,
  runProfile,
  type ResolvedProfileRuntime,
  type RunProfileOptions,
} from './profile-boot.ts'
export { runCli, type RunCliOptions } from './run-cli.ts'
export { reportStartupFailure, type StartupDiagnosticContext } from './startup-diagnostics.ts'
