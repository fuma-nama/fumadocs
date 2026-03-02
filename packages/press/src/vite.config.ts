import { defineConfig } from 'vite';
import { fumapress } from './vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import path from 'node:path';
import { baseDir } from './constants';

export default defineConfig({
  plugins: [
    rsc({
      entries: {
        client: path.join(baseDir, 'dist/entry.browser.mjs'),
        rsc: path.join(baseDir, 'dist/entry.rsc.mjs'),
        ssr: path.join(baseDir, 'dist/entry.ssr.mjs'),
      },
    }),
    react(),
    fumapress(),
  ],
  environments: {
    client: {
      optimizeDeps: {
        include: ['react-router', 'react-router/internal/react-server-client'],
      },
    },
  },

  resolve: {
    alias: {
      'react-router/react-server-index': path.join(
        baseDir,
        'node_modules/react-router/dist/development/index-react-server.mjs',
      ),
    },
  },
});
