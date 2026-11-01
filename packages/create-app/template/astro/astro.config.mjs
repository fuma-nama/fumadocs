// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fumadocs from '@fumadocs/astro';

export default defineConfig({
  integrations: [
    fumadocs({
      components: './src/components/mdx.tsx',
      layout: './src/lib/layout.shared.tsx',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
