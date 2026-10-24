/**
 * Schema-dump entry: inspect the composed profile without applying its plugins.
 * Imports and lazy schema builders execute trusted module code.
 * @module @deepseek-ai/dsh-launcher/dump-config-schema
 */

/* v8 ignore file -- built-bin acceptance drives schema collection and output. */

import { generateConfigSchema, type ConfigSchemaDump } from '@deepseek-ai/dsh-app-boot'
import type { LauncherApplication } from './application.ts'
import { collectConfigDumpLayers } from './dump-config.ts'
import { prepareProfile } from './profile-boot.ts'

/**
 * Print one JSON Schema document; incomplete collection or projection sets exitCode to 1.
 * Profile initialization writes match the YAML dump. Plugin imports may execute
 * top-level code, but collection never applies plugins or evaluates `!!js`.
 * During schema generation, ordinary stdout writes are redirected to stderr.
 * @param application - the application whose name, installation anchor, home, and templates compose the profile.
 * @param profile - the profile name.
 * @param patches - overlay paths, in argv order.
 * @param fromDefaultProfile - shipped template that replaces the profile before loading it.
 * @returns after collection and output, with diagnostics also written to stderr.
 */
export async function runDumpConfigSchema(
  application: LauncherApplication,
  profile: string,
  patches: readonly string[],
  fromDefaultProfile?: string,
): Promise<void> {
  const loaded = prepareProfile(application, profile, true, fromDefaultProfile)
  const layers = collectConfigDumpLayers(application, loaded, false, patches)
  // oxlint-disable-next-line typescript/unbound-method -- Saved only for exact restoration, never called unbound.
  const stdoutWrite = process.stdout.write
  let dump: ConfigSchemaDump
  // Trusted module diagnostics must not precede the JSON document on stdout.
  process.stdout.write = process.stderr.write.bind(process.stderr)
  try {
    dump = await generateConfigSchema(loaded, layers.map(layer => layer.patches), application.installAnchor)
  } finally {
    process.stdout.write = stdoutWrite
  }
  process.stdout.write(`${JSON.stringify(dump, null, 2)}\n`)
  for (const diagnostic of dump['x-cordis'].diagnostics) {
    const location = diagnostic.path === undefined ? '' : ` [${diagnostic.path}]`
    process.stderr.write(`${application.name}: ${diagnostic.level}:${location} ${diagnostic.message}\n`)
  }
  if (!dump['x-cordis'].complete) process.exitCode = 1
}
