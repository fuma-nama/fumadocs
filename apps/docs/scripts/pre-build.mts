import { generateDocs } from '@/scripts/generate-docs.mjs';
import { buildRegistry } from '@/scripts/build-registry.mjs';
import { validateFiles, scanURLs, printErrors } from 'next-validate-link';
import fg from 'fast-glob';
import * as path from 'node:path';
import { getSlugs, parseFilePath } from 'fumadocs-core/source';
import * as fs from 'node:fs/promises';
import { getTableOfContents } from 'fumadocs-core/server';

async function readFromPath(file: string) {
  return {
    path: file,
    content: await fs
      .readFile(path.resolve(file))
      .then((res) => res.toString())
      .catch(() => ''),
  };
}

async function main() {
  async function checkLinks() {
    const docsFiles = await Promise.all(
      await fg('content/docs/**/*.mdx').then((files) =>
        files.map(readFromPath),
      ),
    );

    const blogFiles = await Promise.all(
      await fg('content/blog/**/*.mdx').then((files) =>
        files.map(readFromPath),
      ),
    );

    const scanned = await scanURLs({
      populate: {
        '(home)/blog/[slug]': blogFiles.map((file) => {
          const info = parseFilePath(file.path);
          return { value: getSlugs(info)[2] };
        }),
        'docs/[...slug]': await Promise.all(
          docsFiles.map(async (file) => {
            const info = parseFilePath(file.path);
            const toc = await getTableOfContents(file.content);

            return {
              value: getSlugs(info).slice(2),
              hashes: toc.map((item) => item.url.slice(1)),
            };
          }),
        ),
      },
    });
    console.log(
      `collected ${scanned.urls.size} URLs, ${scanned.fallbackUrls.length} fallbacks`,
    );

    const files = [
      ...docsFiles.map((file) => path.resolve('content/docs', file.path)),
      ...blogFiles.map((file) => path.resolve('content/blog', file.path)),
    ];

    printErrors(
      await validateFiles(files, {
        scanned,
      }),
    );
  }

  await Promise.all([generateDocs(), buildRegistry()]);
  await checkLinks();
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
});
