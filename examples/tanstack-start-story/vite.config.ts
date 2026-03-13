import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    external: ['typescript', 'ts-morph'],
    tsconfigPaths: true,
  },
  plugins: [
    mdx(await import('./source.config')),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    react(),
  ],
});
