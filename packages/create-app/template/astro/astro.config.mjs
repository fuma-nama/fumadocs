// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import {
  rehypeCode,
  remarkCodeTab,
  remarkHeading,
  remarkNpm,
  remarkStructure,
} from 'fumadocs-core/mdx-plugins';

export default defineConfig({
  markdown: {
    processor: unified({
      syntaxHighlight: false,
      remarkPlugins: [
        remarkHeading,
        remarkCodeTab,
        remarkNpm,
        [remarkStructure, { exportAs: 'structuredData' }],
      ],
      rehypePlugins: [rehypeCode],
    }),
  },
  integrations: [
    react(),
    mdx({
      extendMarkdownConfig: false,
      syntaxHighlight: false,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
