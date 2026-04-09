import { defineConfig, type Plugin } from "vitest/config";

/**
 * Plugin to strip .js extensions from imports so Vite can resolve
 * .ts source files. This is needed because TypeScript's Node16 module
 * resolution requires .js extensions in imports, but Vite runs .ts
 * source directly and doesn't map .js → .ts.
 */
function jsExtensionResolve(): Plugin {
  return {
    name: "js-extension-resolve",
    resolveId(source, importer) {
      if (source.endsWith(".js") && importer) {
        // Replace .js with .ts and let Vite resolve it
        return this.resolve(source.replace(/\.js$/, ".ts"), importer, { skipSelf: true });
      }
    },
  };
}

export default defineConfig({
  test: {
    globals: true,
  },
  plugins: [jsExtensionResolve()],
});
