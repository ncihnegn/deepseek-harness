/**
 * The `dsh` identity the shared launcher runs with.
 * @module @deepseek-ai/dsh/application
 */

import { fileURLToPath } from 'node:url'
import { getDshRuntimeVersion, loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type { LauncherApplication } from '@deepseek-ai/dsh-launcher'
import { DEFAULT_PROFILE_BUNDLES, PROFILE_TEMPLATES } from '@deepseek-ai/dsh-official-bundles'

/** The launcher's own help text; each app prints its own. */
const HELP_EXAMPLES = `
Examples:
  dsh web                                   boot the web profile (same as: dsh --profile web)
  dsh rescue --from-default-profile web
                                            recreate rescue from the shipped web template, then boot it
  dsh headless "run the tests"              answer one task, print the result, and exit
  dsh tui --patch ./extra.yml               boot a custom profile with one extra overlay
  dsh tui --resume <session>                arguments after the launcher flags reach the app
  dsh web --help                            the web app's own flags and help
  dsh plugin --profile tui add <package>    install a plugin into the tui profile
`

/** Absolute path of this installation's package.json (both anchors: src/ and lib/ sit one level under apps/cli). */
const INSTALL_ANCHOR = fileURLToPath(new URL('../package.json', import.meta.url))

/**
 * The shipped profiles and installation paths behind every `dsh` surface.
 *
 * Desktop's Electron application owns the `desktop` profile: this launcher
 * never boots, resets, or dumps it, and manages its plugins only through the
 * Desktop carrier's own entry point.
 */
export const dshApplication: LauncherApplication = {
  name: 'dsh',
  version: getDshRuntimeVersion,
  installAnchor: INSTALL_ANCHOR,
  home: resolveDshHome,
  environment: () => loadLayeredEnv('dsh'),
  templates: PROFILE_TEMPLATES,
  defaultBundles: DEFAULT_PROFILE_BUNDLES,
  description: 'dsh: boot a DeepSeek Harness profile — an ordered stack of plugin-bundle patch layers under your own overrides.',
  examples: HELP_EXAMPLES,
  reservedProfile: {
    name: 'desktop',
    initializer: 'DeepSeek Harness Desktop',
    manager: 'the Electron application',
  },
}
