import {
  type FileObject,
  printErrors,
  scanURLs,
  validateFiles,
} from 'next-validate-link';
import { InferPageType } from 'fumadocs-core/source';
import { blog, source } from '@/lib/source';

type AnySource = typeof blog | typeof source;

async function checkLinks() {
  const scanned = await scanURLs({
    populate: {
      '(home)/blog/[slug]': await Promise.all(
        blog.getPages().map(async (page) => ({
          value: {
            slug: page.slugs[0],
          },
          hashes: await getHeadings(page),
        })),
      ),
      'docs/[...slug]': await Promise.all(
        source.getPages().map(async (page) => {
          return {
            value: {
              slug: page.slugs,
            },
            hashes: await getHeadings(page),
          };
        }),
      ),
    },
  });

  console.log(
    `collected ${scanned.urls.size} URLs, ${scanned.fallbackUrls.length} fallbacks`,
  );

  printErrors(
    await validateFiles(
      [...(await getFiles(source)), ...(await getFiles(blog))],
      {
        scanned,
        markdown: {
          components: {
            Card: { attributes: ['href'] },
          },
        },
        checkRelativePaths: 'as-url',
      },
    ),
    true,
  );
}

async function getHeadings({
  data,
}: InferPageType<AnySource>): Promise<string[]> {
  if ('type' in data && data.type === 'openapi') return [];
  const { _exports, toc } = await data.load();
  const headings = toc.map((item) => item.url.slice(1));
  const elementIds = _exports?.elementIds;
  if (Array.isArray(elementIds)) {
    headings.push(...elementIds);
  }

  return headings;
}

async function getFiles(source: AnySource) {
  const files: FileObject[] = [];
  for (const page of source.getPages()) {
    if ('type' in page.data && page.data.type === 'openapi') continue;

    files.push({
      data: page.data,
      url: page.url,
      path: page.data.info.fullPath,
      content: await page.data.getText('raw'),
    });
  }

  return files;
}

void checkLinks();
