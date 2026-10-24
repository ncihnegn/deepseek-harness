/** A launcher identity for tests: dsh's names over a caller-supplied installation anchor. */

import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { DEFAULT_PROFILE_BUNDLES, PROFILE_TEMPLATES } from '@deepseek-ai/dsh-official-bundles'
import type { LauncherApplication } from '../../src/application.ts'

/** This package's own manifest, used when a test does not need a specific installation. */
export const TEST_INSTALL_ANCHOR = fileURLToPath(new URL('../../package.json', import.meta.url))

/**
 * Build the dsh launcher identity with test defaults.
 * @param overrides - fields a test replaces, such as the installation anchor.
 * @returns the launcher application.
 */
export function testApplication(
  overrides: Partial<Pick<LauncherApplication, 'installAnchor' | 'home' | 'name' | 'version'>> = {},
): LauncherApplication {
  return {
    name: 'dsh',
    version: () => '1.2.3',
    installAnchor: TEST_INSTALL_ANCHOR,
    // Resolved per call, as the real identity does: DSH_HOME changes after import.
    home: () => process.env.DSH_HOME ?? join(fileURLToPath(new URL('..', import.meta.url)), 'home'),
    environment: () => createLaunchEnvironmentSnapshot([]),
    templates: PROFILE_TEMPLATES,
    defaultBundles: DEFAULT_PROFILE_BUNDLES,
    description: 'dsh: boot a DeepSeek Harness profile.',
    reservedProfile: {
      name: 'desktop',
      initializer: 'DeepSeek Harness Desktop',
      manager: 'the Electron application',
    },
    ...overrides,
  }
}
