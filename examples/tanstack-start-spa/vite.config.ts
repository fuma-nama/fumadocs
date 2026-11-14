import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig, runnerImport } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { glob } from 'node:fs/promises';
import { getSlugs } from 'fumadocs-core/source';
import { getPageImageUrl } from './src/lib/shared';

// TanStack Start prerenders responses as text, which breaks images, and requests files with a trailing slash
const nitroRoutes: string[] = [];
for await (const entry of glob('**/*.{md,mdx}', { cwd: 'content/docs' })) {
  nitroRoutes.push(getPageImageUrl({ slugs: getSlugs(entry) }).url);
}

const { docsLlms } = (
  await runnerImport<typeof import('./src/lib/source')>('./src/lib/source.ts', {
    plugins: [fumadocsMdx()],
    resolve: { tsconfigPaths: true },
  })
).module;
nitroRoutes.push(...(await docsLlms.files()));

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          crawlLinks: true,
        },
      },

      pages: [
        {
          path: '/docs',
        },
        {
          path: '/api/search',
        },
      ],
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
    nitro({
      prerender: { routes: nitroRoutes },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: 'tslib/tslib.es6.js',
    },
  },
});
