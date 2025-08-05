import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import mdx from 'fumadocs-mdx/vite';
import * as MdxConfig from './source.config';
import rsc from '@vitejs/plugin-rsc';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    noExternal: ['fumadocs-core', 'fumadocs-ui'],
    alias: {
      '@mdx-components': fileURLToPath(
        new URL('./app/mdx-components', import.meta.url),
      ),
    },
  },
  plugins: [
    mdx(MdxConfig),
    tailwindcss(),
    react(),
    rsc({
      entries: {
        client: 'react-router-vite/entry.browser.tsx',
        rsc: 'react-router-vite/entry.rsc.tsx',
        ssr: 'react-router-vite/entry.ssr.tsx',
      },
    }),
    tsconfigPaths(),
  ],
});
