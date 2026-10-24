// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import fumadocs from '@fumadocs/astro';

export default defineConfig({
  integrations: [react(), mdx(), fumadocs({ components: './src/components/mdx.tsx' })],
  vite: {
    plugins: [tailwindcss()],
  },
});
