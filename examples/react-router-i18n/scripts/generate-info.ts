import { register } from 'fumadocs-mdx/node';
import { postInstall } from 'fumadocs-mdx/vite';
import { writeFile } from 'node:fs/promises';

register();

await postInstall({
  index: {
    target: 'default',
  },
});

export interface Info {
  prerender: string[];
}

const { source } = await import('../app/lib/source.ts');
const info: Info = {
  prerender: source.getPages().map((page) => page.url),
};

await writeFile('.react-router/_info', JSON.stringify(info));
