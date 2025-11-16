import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import { i18n } from './src/lib/i18n';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    mdx(await import('./source.config')),
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      prerender: {
        enabled: true,
      },
      pages: [
        ...i18n.languages.map((lang) => ({
          path: `/${lang}`,
        })),
        {
          path: '/',
          prerender: { enabled: false },
        },
      ],
    }),
    react(),
  ],
});
