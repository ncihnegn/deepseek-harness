/**
 * Command dispatch for an application's launcher entry: parse argv once, then
 * load only the selected runner.
 * @module @deepseek-ai/dsh-launcher/run-cli
 */

import { StartupError } from '@deepseek-ai/dsh-app-boot'
import type { LauncherApplication } from './application.ts'
import { parseLauncherArgs } from './args.ts'
import { reportStartupFailure } from './startup-diagnostics.ts'
import type { RunProfileOptions } from './profile-boot.ts'

/** Installation-owned dependencies supplied by a packaged launcher entry. */
export type RunCliOptions = Pick<RunProfileOptions, 'packageManager'> & {
  /** Permit plugin commands for the reserved profile's installed carrier. */
  manageReservedProfile?: boolean
}

/**
 * Run one application's command-line interface.
 * @param application - the application whose identity, profiles, and environment this launcher uses.
 * @param options - package runtime and reserved-profile access supplied by the installation.
 * @returns a promise that settles when the selected command mode finishes.
 */
export async function runCli(application: LauncherApplication, options: RunCliOptions = {}): Promise<void> {
  const version = application.version()
  const { manageReservedProfile, ...profileOptions } = options
  const invocation = parseLauncherArgs(application, process.argv.slice(2), manageReservedProfile)

  switch (invocation.mode) {
    case 'profile': {
      const { runProfile } = await import('./profile-boot.ts')
      try {
        await runProfile(application, {
          environment: application.environment(),
          profile: invocation.profile,
          fromDefaultProfile: invocation.fromDefaultProfile,
          patchFiles: invocation.patches,
          args: invocation.args,
          ...profileOptions,
        })
      } catch (error) {
        if (!(error instanceof StartupError)) throw error
        await reportStartupFailure(error, {
          name: application.name,
          home: application.home(),
          version,
          profile: invocation.profile,
        })
        process.exit(1)
      }
      break
    }
    case 'plugin': {
      const { runPlugin } = await import('./plugin.ts')
      process.exit(await runPlugin(application, invocation.profile, invocation.args, options.packageManager))
      break
    }
    case 'dump-config': {
      const { runDumpConfig } = await import('./dump-config.ts')
      runDumpConfig(
        application,
        invocation.profile,
        invocation.defaultOnly,
        invocation.patches,
        invocation.fromDefaultProfile,
      )
      break
    }
    case 'dump-config-schema': {
      const { runDumpConfigSchema } = await import('./dump-config-schema.ts')
      await runDumpConfigSchema(application, invocation.profile, invocation.patches, invocation.fromDefaultProfile)
      break
    }
    default:
      invocation satisfies never
      throw new Error(`${application.name}: unhandled invocation mode ${JSON.stringify(invocation)}`)
  }
}
