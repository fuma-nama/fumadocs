import { type FileObject, printErrors, scanURLs, validateFiles } from 'next-validate-link';
import { glob } from 'node:fs/promises';
import { blogLoader, source } from '@/lib/source';
import { isFramework } from '@/lib/framework';
import { i18n } from '@/lib/i18n';

type AnySource = typeof blogLoader | typeof source;

async function checkLinks() {
  // the URLs of the default language, which hides the `[lang]` segment
  const scanned = await scanURLs({
    cwd: 'app/[lang]',
    pages: await Array.fromAsync(glob('**/page.{tsx,mdx}', { cwd: 'app/[lang]' })),
    populate: {
      '(home)/blog/[slug]': await Promise.all(
        blogLoader.getPages().map(async (page) => ({
          value: {
            slug: page.slugs[0],
          },
          hashes: await getHeadings(page),
        })),
      ),
      'docs/[[...slug]]': await Promise.all(
        source.getPages(i18n.defaultLanguage).map(async (page) => {
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

  // links to pages of `[framework]` omit the framework segment, with the headings of every framework
  for (const page of source.getPages(i18n.defaultLanguage)) {
    const framework = page.params?.framework;
    const meta = scanned.urls.get(page.url);
    if (!isFramework(framework) || !meta) continue;
    const url = page.url.replace(`/${framework}`, '');
    const alias = scanned.urls.get(url);
    if (alias) alias.hashes = [...new Set([...(alias.hashes ?? []), ...(meta.hashes ?? [])])];
    else scanned.urls.set(url, { hashes: meta.hashes });
  }

  console.log(`collected ${scanned.urls.size} URLs, ${scanned.fallbackUrls.length} fallbacks`);

  printErrors(
    await validateFiles([...(await getFiles(source)), ...(await getFiles(blogLoader))], {
      scanned,
      markdown: {
        components: {
          Card: { attributes: ['href'] },
        },
      },
      checkRelativePaths: 'as-url',
    }),
    true,
  );
}

async function getHeadings(page: AnySource['$inferPage']): Promise<string[]> {
  if (page.type !== 'docs') return [];
  const { _exports, toc } = await page.data.load();
  const headings = toc.map((item) => item.url.slice(1));
  const elementIds = _exports?.elementIds;
  if (Array.isArray(elementIds)) {
    headings.push(...elementIds);
  }

  return headings;
}

async function getFiles(source: AnySource) {
  const files: FileObject[] = [];
  const paths = new Set<string>();
  for (const page of source.getPages()) {
    // translations have the links of their source
    if (page.locale && page.locale !== i18n.defaultLanguage) continue;
    // a file of `[framework]` is checked once
    if (page.type !== 'docs' || paths.has(page.data.info.fullPath)) continue;
    paths.add(page.data.info.fullPath);

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
