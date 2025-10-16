import type { Config } from '@react-router/dev/config';
import fs from 'node:fs/promises';
import type { Info } from './scripts/generate-info';

export default {
  ssr: true,
  async prerender({ getStaticPaths }) {
    const info: Info = JSON.parse(
      (await fs.readFile('.react-router/_info')).toString(),
    );

    const paths: string[] = [];
    for (const path of getStaticPaths()) {
      // ignore dynamic document search
      if (path === '/api/search') continue;
      paths.push(path);
    }

    paths.push(...info.prerender);
    return paths;
  },
} satisfies Config;
