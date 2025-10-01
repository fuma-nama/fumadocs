import { defineConfig } from 'vite';
import { fumapress } from 'fumapress/dist/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [fumapress(), tailwindcss()],
});
