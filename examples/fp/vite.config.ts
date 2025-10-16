import { defineConfig } from 'vite';
import { fumapress } from 'fumapress/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [fumapress(), tailwindcss()],
});
