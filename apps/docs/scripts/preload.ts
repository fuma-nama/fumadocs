import { createMdxPlugin } from 'fumadocs-mdx/bun';
import { postInstall } from 'fumadocs-mdx/next';

process.env.LINT = '1';
const configPath = 'source.config.ts';
await postInstall({ configPath });
Bun.plugin(createMdxPlugin({ configPath }));
