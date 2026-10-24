/** Profile package management and explicit, exact-version compatibility approvals. */

import { runPluginCommand, runProfilePnpm, setProfileVersionExemption, type PackageOperationOptions } from '@deepseek-ai/dsh-plugin-manager/operations'
import { initProfile, readProfileCompatibility, resolveProfileDir, type ProfileContext } from '@deepseek-ai/dsh-app-boot'
import { withFileLock } from '@deepseek-ai/dsh-atomic-write'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { LauncherApplication } from './application.ts'

/**
 * Require the reserved profile the embedding application already initialized.
 * @param application - the application naming the diagnostic and the reserved profile.
 * @param profile - the reserved profile name.
 * @param dir - its profile directory.
 * @throws when the profile has no manifest, so package management never creates one.
 */
function requireReservedProfile(application: LauncherApplication, profile: string, dir: string): void {
  if (existsSync(join(dir, 'package.json'))) return
  const initializer = application.reservedProfile?.initializer ?? `the ${application.name} application`
  throw new Error(
    `Open ${initializer} once to initialize its profile, then fully quit it before running `
    + `${application.name} plugin --profile ${profile}.`,
  )
}

/** Parse only application-owned commands; all other arguments remain pnpm's responsibility. */
async function versionCommand(
  application: LauncherApplication,
  profile: string,
  args: readonly string[],
): Promise<number | undefined> {
  const [command, ...rest] = args
  if (command !== 'allow-version' && command !== 'revoke-version' && command !== 'version-exemptions') return undefined
  try {
    let packageVersion: string | undefined
    let runtimeVersion: string | undefined
    let acceptRisk = false
    const argumentsIterator = rest.values()
    for (const argument of argumentsIterator) {
      if (argument === '--accept-risk' && command === 'allow-version' && !acceptRisk) acceptRisk = true
      else if (argument === '--dsh-version' && runtimeVersion === undefined) runtimeVersion = argumentsIterator.next().value
      else if (argument.startsWith('--dsh-version=') && runtimeVersion === undefined) runtimeVersion = argument.slice('--dsh-version='.length)
      else if (!argument.startsWith('-') && packageVersion === undefined) packageVersion = argument
      else throw new Error(`unexpected argument ${JSON.stringify(argument)}`)
    }
    if (command === 'version-exemptions' && rest.length > 0) {
      throw new Error(`usage: ${application.name} plugin version-exemptions`)
    }
    let request: { packageVersion: string; runtimeVersion: string } | undefined
    if (command !== 'version-exemptions') {
      if (packageVersion === undefined || runtimeVersion === undefined) {
        throw new Error(`usage: ${application.name} plugin ${command} <package@version> --dsh-version <exact>${command === 'allow-version' ? ' --accept-risk' : ''}`)
      }
      request = { packageVersion, runtimeVersion }
    }
    if (command === 'allow-version') {
      process.stderr.write(
        `${application.name}: warning: allowing incompatible plugin versions can break the application or corrupt data. `
        + 'Approval applies only to the exact package and DSH versions.\n',
      )
    }
    const reserved = isReservedProfile(application, profile)
    const dir = resolveProfileDir(profile)
    if (!reserved) await mkdir(dir, { recursive: true })
    await withFileLock(join(dir, 'package.json'), async () => {
      if (reserved) requireReservedProfile(application, profile, dir)
      else if (!existsSync(join(dir, 'package.json'))) {
        initProfile(dir, application.templates[profile]?.bundles ?? application.defaultBundles)
      }
      if (request === undefined) {
        const { exemptions, warnings } = readProfileCompatibility(dir)
        for (const warning of warnings) process.stderr.write(`${application.name}: warning: ${warning}\n`)
        process.stdout.write(JSON.stringify(exemptions, undefined, 2) + '\n')
      } else {
        await setProfileVersionExemption(dir, request.packageVersion, request.runtimeVersion, command === 'allow-version', acceptRisk)
        process.stdout.write(
          `${application.name}: ${command === 'allow-version' ? 'allowed' : 'revoked'} `
          + `${request.packageVersion} for DSH ${request.runtimeVersion}\n`,
        )
      }
    }, { waitMs: 120000 })
    return 0
  } catch (error) {
    process.stderr.write(`${application.name}: ${String(error)}\n`)
    return 1
  }
}

/**
 * Whether the profile belongs to the embedding application rather than this launcher.
 * @param application - the application whose reserved profile is compared.
 * @param profile - the requested profile name.
 * @returns true for the reserved profile's exact name.
 */
function isReservedProfile(application: LauncherApplication, profile: string): boolean {
  return application.reservedProfile !== undefined && profile === application.reservedProfile.name
}

/**
 * Run package management for a profile.
 * @param application - the application whose name, installation anchor, and reserved profile apply.
 * @param profile - profile name; the reserved profile must already be initialized by its application.
 * @param args - application exemption command or pnpm arguments relative to the invoking directory.
 * @param packageManager - installation-owned executable and environment for pnpm operations.
 * @returns Zero on success; nonzero on invalid approval or package-manager failure.
 */
export async function runPlugin(
  application: LauncherApplication,
  profile: string,
  args: readonly string[],
  packageManager?: ProfileContext['packageManager'],
): Promise<number> {
  const name = application.name
  const reserved = isReservedProfile(application, profile)
  if (reserved) {
    try { requireReservedProfile(application, profile, resolveProfileDir(profile)) } catch (error) {
      process.stderr.write(`${name}: ${String(error)}\n`)
      return 1
    }
  }
  const versionResult = await versionCommand(application, profile, args)
  if (versionResult !== undefined) return versionResult
  const dir = resolveProfileDir(profile)
  if (existsSync(join(dir, 'package.json'))) {
    for (const warning of readProfileCompatibility(dir).warnings) process.stderr.write(`${name}: warning: ${warning}\n`)
  }
  const context = { profile, dir, installAnchor: application.installAnchor, cwd: process.cwd() }
  const options: PackageOperationOptions = {
    ...packageManager,
    execution: 'cli',
    outputBytes: 16384,
    lockWaitMs: 120000,
    lookupTimeoutMs: 120000,
    onOutput: (text, stream) => { process[stream].write(text) },
  }
  const result = reserved
    ? await withFileLock(join(dir, 'package.json'), async () => {
      requireReservedProfile(application, profile, dir)
      return runProfilePnpm(context, args, options)
    }, { waitMs: 120000 })
    : await runPluginCommand(context, args, options)
  if (result.exitCode === 127) {
    process.stderr.write(`${name}: pnpm was not found; install pnpm and make it available on PATH.\n`)
  }
  for (const { name: packageName, version, runtimeVersion } of result.incompatible ?? []) {
    process.stderr.write(
      `${name}: to accept the risk, run: ${name} plugin --profile ${profile} `
      + `allow-version ${packageName}@${version} --dsh-version ${runtimeVersion} --accept-risk\n`,
    )
  }
  if (result.exitCode !== 0) process.stderr.write(`${name}: plugin command failed; diagnostics: ${result.logPath}\n`)
  if (result.exitCode !== 0 && args.some(argument => /^git\+|^github:|\.git(?:#|$)/.test(argument))) {
    process.stderr.write(
      `${name}: git-hosted plugins build on install via their prepare script, which pnpm blocks until allowed — `
      + `add the exact key pnpm printed above under allowBuilds in ${join(resolveProfileDir(profile), 'pnpm-workspace.yaml')}, then re-run\n`,
    )
  }
  return result.exitCode
}
