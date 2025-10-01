import { defineConfig } from 'vite';
import { fumapress } from 'fumapress/dist/vite';

export default defineConfig({
  environments: {
    rsc: {
      build: {
        manifest: false,
      },
    },
  },
  plugins: [fumapress()],
});
