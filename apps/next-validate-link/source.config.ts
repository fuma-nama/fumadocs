import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { fileGenerator, remarkDocGen, remarkInstall } from 'fumadocs-docgen';

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkInstall,
      [remarkDocGen, { generators: [fileGenerator()] }],
    ],
    rehypeCodeOptions: {
      themes: {
        light: 'catppuccin-latte',
        dark: 'catppuccin-mocha',
      },
    },
  },
});
