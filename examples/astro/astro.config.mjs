// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/astro';
import * as SourceConfig from './source.config';

export default defineConfig({
  integrations: [react(), mdx(SourceConfig)],
  vite: {
    plugins: [tailwindcss()],
  },
});
