import {
  type FileObject,
  printErrors,
  scanURLs,
  validateFiles,
} from 'next-validate-link';
import type { InferPageType } from 'fumadocs-core/source';
import { blog, source } from '@/lib/source';

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
      [...source.getPages().map(toFile), ...blog.getPages().map(toFile)],
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

function getHeadings({
  data,
}: InferPageType<typeof source> | InferPageType<typeof blog>) {
  const headings = data.toc.map((item) => item.url.slice(1));
  const elementIds = data._exports?.elementIds;
  if (Array.isArray(elementIds)) {
    headings.push(...elementIds);
  }

  return headings;
}

function toFile(
  page: InferPageType<typeof source> | InferPageType<typeof blog>,
): FileObject {
  return {
    data: page.data,
    url: page.url,
    path: page.absolutePath,
    content: page.data.content,
  };
}

void checkLinks();
