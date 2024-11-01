import { generateDocs } from '@/scripts/generate-docs.mjs';
import { buildRegistry } from '@/scripts/build-registry.mjs';
import { scanURLs } from '@/scripts/check-links/scan.mjs';
import { validateFiles } from '@/scripts/check-links/validate.mjs';
import fg from 'fast-glob';
import * as path from 'node:path';
import { getSlugs, parseFilePath } from 'fumadocs-core/source';

async function main() {
  const files = await fg('**/*.mdx', {
    cwd: path.resolve('content'),
  });

  await Promise.all([
    scanURLs({
      '(home)/blog/[slug]': files
        .filter((file) => file.startsWith('blog'))
        .map((file) => {
          const info = parseFilePath(file.slice('blog'.length));
          return getSlugs(info)[0];
        }),
      'docs/[...slug]': files
        .filter((file) => file.startsWith('docs'))
        .map((file) => {
          const info = parseFilePath(file.slice('docs'.length));
          return getSlugs(info);
        }),
    }).then(async (urls) => {
      console.log(`collected ${urls.size} URLs`);
      const files = await fg('content/**/*.mdx');

      return validateFiles(files, urls);
    }),
    generateDocs(),
    buildRegistry(),
  ]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
});
