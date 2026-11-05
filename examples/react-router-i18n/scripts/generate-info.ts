import { register } from 'fumadocs-mdx/node';
import { mkdir, writeFile } from 'node:fs/promises';

register();

export interface Info {
  prerender: string[];
}

const { source } = await import('../app/lib/source.ts');
const info: Info = {
  prerender: source.getPages().map((page) => page.url),
};

await mkdir('.react-router', { recursive: true });
await writeFile('.react-router/_info', JSON.stringify(info));
