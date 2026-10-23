import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  platform: 'node',
  entry: ['./src/index.ts', './src/hono.ts', './src/cli.ts', './src/worker.ts'],
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
    // `serializePageTree()` imports it, the Node build shares its renderer with `react-dom/static`
    'react-dom/server.edge': 'react-dom/server.node',
  },
  deps: {
    // json-magic imports undici only to block private networks, which isn't enabled.
    // code blocks are highlighted with Highlights, the server never loads Shiki.
    neverBundle: ['undici', /^shiki(\/|$)/],
    onlyImport: ['hono', 'undici', 'shiki'],
  },
  checks: {
    moduleLevelDirective: false,
  },
  inputOptions: {
    // the Node default (`main` first) picks CommonJS builds that can't be tree-shaken, like lucide-react
    resolve: { mainFields: ['module', 'main'] },
  },
});
