import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // assets are served under the `baseUrl` of users
  base: './',
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist/client',
    manifest: true,
    rolldownOptions: {
      input: 'src/app/client.tsx',
      checks: {
        moduleLevelDirective: false,
      },
    },
  },
});
