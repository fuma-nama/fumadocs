import { generateDocs } from '@/scripts/generate-docs.mjs';
import { buildRegistry } from '@/scripts/build-registry.mjs';
import { validateFiles, scanURLs, printErrors } from 'next-validate-link';
import fg from 'fast-glob';
import * as path from 'node:path';
import { getSlugs, parseFilePath } from 'fumadocs-core/source';

async function main() {
  const docsFiles = await fg('**/*.mdx', {
    cwd: path.resolve('content/docs'),
  });

  const blogFiles = await fg('**/*.mdx', {
    cwd: path.resolve('content/blog'),
  });

  await Promise.all([
    scanURLs({
      '(home)/blog/[slug]': blogFiles.map((file) => {
        const info = parseFilePath(file);
        return getSlugs(info)[0];
      }),
      'docs/[...slug]': docsFiles.map((file) => {
        const info = parseFilePath(file);
        return getSlugs(info);
      }),
    }).then(async (urls) => {
      console.log(`collected ${urls.size} URLs`);
      const files = [
        ...docsFiles.map((file) => path.resolve('content/docs', file)),
        ...blogFiles.map((file) => path.resolve('content/blog', file)),
      ];

      printErrors(await validateFiles(files, urls));
    }),
    generateDocs(),
    buildRegistry(),
  ]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
});
