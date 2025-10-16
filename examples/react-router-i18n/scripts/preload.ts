import { createMdxPlugin } from 'fumadocs-mdx/bun';
import { postInstall } from 'fumadocs-mdx/vite';

Bun.plugin(createMdxPlugin());

await postInstall(undefined, {
  runtime: 'bun',
});
