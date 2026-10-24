import { defineConfig } from 'tsdown'

/**
 * The launcher publishes one ES module. Its command modes are imported lazily,
 * so the build inlines those imports instead of emitting sibling chunks the
 * package does not publish; `runCli` still evaluates only the selected mode.
 */
export default defineConfig({
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  outputOptions: { inlineDynamicImports: true },
})
