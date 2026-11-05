import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
    nitro({
      preset: 'vercel',
      // Shiki's wasm has imports that Nitro can't bundle, its default entry inlines the binary
      wasm: false,
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: 'tslib', replacement: 'tslib/tslib.es6.js' },
      // Nitro keeps the shim's `require('react')`, which loads a second React at runtime
      { find: /^use-sync-external-store\/shim$/, replacement: 'react' },
    ],
  },
});
