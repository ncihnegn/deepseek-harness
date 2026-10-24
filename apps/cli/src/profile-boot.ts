/**
 * `dsh`-bound profile boot shared with the Desktop host. The lifecycle itself
 * lives in `@deepseek-ai/dsh-launcher`; this module supplies the dsh identity.
 * @module @deepseek-ai/dsh/profile-boot
 */

import { runProfile as runLauncherProfile, type RunProfileOptions } from '@deepseek-ai/dsh-launcher'
import type { Context } from '@deepseek-ai/cordis'
import type { ProcessShutdown } from '@deepseek-ai/dsh-launcher'
import { dshApplication } from './application.ts'

export type { RunProfileOptions }

/**
 * Boot one dsh profile invocation end to end and leave process lifetime to the
 * mounted plugins (or to a one-shot runner the composition mounts).
 * @param options - environment snapshot, profile name, overlays, and the booted app's own arguments.
 * @returns the settled root context and the shutdown controller.
 */
export async function runProfile(options: RunProfileOptions): Promise<{ ctx: Context; shutdown: ProcessShutdown }> {
  return runLauncherProfile(dshApplication, options)
}
