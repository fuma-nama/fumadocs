import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from '@fumapress/core/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
