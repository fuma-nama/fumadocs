import { defineConfig } from '@tanstack/react-start/config';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    hooks: {
      'prerender:routes': async (routes) => {
        const { source } = await import('./lib/source');
        const pages = source.getPages();

        for (const page of pages) {
          routes.add(page.url);
        }
      },
    },
    prerender: {
      routes: ['/'],
      crawlLinks: true,
    },
  },
  vite: {
    build: {
      rollupOptions: {
        // Shiki results in a huge bundle because Rollup tries to bundle every language/theme
        external: ['shiki'],
        // most React.js libraries now include 'use client'
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
          }
          warn(warning);
        },
      },
    },
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
    ],
  },
});
