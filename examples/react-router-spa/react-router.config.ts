import type { Config } from '@react-router/dev/config';
import { glob } from 'node:fs/promises';
import { createGetUrl, getSlugs } from 'fumadocs-core/source';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { runnerImport } from 'vite';
import { getPageImageUrl } from './app/lib/shared';

const getUrl = createGetUrl('/docs');

export default {
  ssr: false,
  async prerender({ getStaticPaths }) {
    const paths: string[] = [];
    const excluded: string[] = [];

    for (const path of getStaticPaths()) {
      if (!excluded.includes(path)) paths.push(path);
    }

    for await (const entry of glob('**/*.{md,mdx}', { cwd: 'content/docs' })) {
      const slugs = getSlugs(entry);
      paths.push(getUrl(slugs), getPageImageUrl({ slugs }).url);
    }

    const { docsLlms } = (
      await runnerImport<typeof import('./app/lib/source')>('./app/lib/source.ts', {
        plugins: [fumadocsMdx()],
        resolve: { tsconfigPaths: true },
      })
    ).module;
    for (const path of await docsLlms.files())
      paths.push(path === '/llms.txt' || path === '/llms-full.txt' ? path : `/llms.mdx${path}`);

    return paths;
  },
} satisfies Config;
