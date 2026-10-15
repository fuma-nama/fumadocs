import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  platform: 'node',
  entry: ['./src/index.ts', './src/hono.ts', './src/cli.ts'],
  fixedExtension: false,
  minify: true,
  sourcemap: false,
  dts: {
    sourcemap: false,
  },
  // the server renders the same UI as the client bundle, so both are bundled from the same sources
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  alias: {
    'fumadocs-core/highlight/shiki/full': new URL('./src/app/shiki.ts', import.meta.url).pathname,
    // `serializePageTree()` imports it, the Node build shares its renderer with `react-dom/static`
    'react-dom/server.edge': 'react-dom/server.node',
  },
  deps: {
    // json-magic imports it only to block private networks, which isn't enabled
    neverBundle: ['undici'],
    onlyImport: ['hono', 'undici'],
  },
  checks: {
    moduleLevelDirective: false,
  },
  inputOptions: {
    // the Node default (`main` first) picks CommonJS builds that can't be tree-shaken, like lucide-react
    resolve: { mainFields: ['module', 'main'] },
  },
});
