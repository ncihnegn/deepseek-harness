#!/usr/bin/env node
/**
 * Command-line entry for dsh.
 * @module @deepseek-ai/dsh/bin
 */

/* v8 ignore file -- built-bin acceptance exercises this self-executing dispatch. */

import { runCli as runLauncher, type RunCliOptions as LauncherRunCliOptions } from '@deepseek-ai/dsh-launcher'
import { dshApplication } from './application.ts'

/** Installation-owned dependencies supplied by a packaged CLI launcher. */
export type RunCliOptions = LauncherRunCliOptions & {
  /** Permit plugin commands for Desktop's existing profile; reserved for its installed carrier. */
  manageDesktopProfile?: boolean
}

/**
 * Run the public dsh command-line interface.
 * @param options - Package runtime and Desktop profile access supplied by the installation.
 * @returns a promise that settles when the selected command mode finishes.
 */
export async function runCli(options: RunCliOptions = {}): Promise<void> {
  const { manageDesktopProfile, ...launcherOptions } = options
  await runLauncher(dshApplication, {
    ...launcherOptions,
    ...(manageDesktopProfile === undefined ? {} : { manageReservedProfile: manageDesktopProfile }),
  })
}

if (import.meta.main) {
  await runCli()
}
