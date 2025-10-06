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
      '(home)/blog/[slug]': blog.getPages().map((page) => ({
        value: {
          slug: page.slugs[0],
        },
        hashes: getHeadings(page),
      })),
      'docs/[...slug]': source.getPages().map((page) => {
        return {
          value: {
            slug: page.slugs,
          },
          hashes: getHeadings(page),
        };
      }),
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

function getHeadings({ data }: InferPageType<AnySource>): string[] {
  if ('type' in data && data.type === 'openapi') return [];
  const headings = data.toc.map((item) => item.url.slice(1));
  const elementIds = data._exports?.elementIds;
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
      path: page.absolutePath,
      content: await page.data.getText('raw'),
    });
  }

  return files;
}

void checkLinks();
