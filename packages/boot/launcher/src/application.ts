/**
 * The application facts a launcher needs.
 *
 * The launcher owns the command grammar, profile composition, plugin
 * management, config dumps, and bounded shutdown; it owns no product identity.
 * Every name, version, path, and shipped template comes from the application
 * that calls it, so another application reuses the same launcher by supplying
 * its own {@link LauncherApplication}.
 * @module @deepseek-ai/dsh-launcher/application
 */

import type { LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'

/** One shipped profile template: the bundle layers a fresh profile starts with. */
export interface LauncherProfileTemplate {
  /** Bundle package names in the profile manifest's `dsh.profile.bundles` order. */
  readonly bundles: readonly string[]
}

/**
 * A profile an embedding application initializes and keeps.
 *
 * The launcher refuses to boot, reset, or dump it, and manages its packages
 * only when the embedding carrier opts in, because the application that owns
 * the profile also owns its file lock and its package manager.
 */
export interface ReservedProfileApplication {
  /** Profile name, compared without case, e.g. `desktop`. */
  readonly name: string
  /** Application that initializes the profile; named in plugin-management instructions. */
  readonly initializer: string
  /** Application named when a boot or dump request is rejected. */
  readonly manager: string
}

/** Everything the launcher needs to know about the application it launches. */
export interface LauncherApplication {
  /** CLI and diagnostic name, e.g. `dsh`. */
  readonly name: string
  /**
   * Version printed by `--version`.
   * @returns the running installation's version string.
   */
  version(): string
  /** Absolute path of this installation's `package.json`; anchors profile runtime resolution. */
  readonly installAnchor: string
  /**
   * Harness home holding profiles, startup diagnostics, and the home-level patch layer.
   * Resolved per call: the environment may change after import.
   * @returns the absolute home directory.
   */
  home(): string
  /**
   * This invocation's frozen environment, read before any tree entry mounts.
   * @returns the launch environment snapshot.
   */
  environment(): LaunchEnvironmentSnapshot
  /** Shipped profile templates keyed by profile name. */
  readonly templates: Readonly<Record<string, LauncherProfileTemplate>>
  /** Bundle list written into a first-use custom profile. */
  readonly defaultBundles: readonly string[]
  /** One-line description printed in the launcher's own help. */
  readonly description: string
  /** Trailing help text, conventionally an `Examples:` block; omitted when empty. */
  readonly examples?: string
  /** Profile an embedding application owns, when there is one. */
  readonly reservedProfile?: ReservedProfileApplication
}
