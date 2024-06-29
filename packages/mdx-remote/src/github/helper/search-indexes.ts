import { structure } from 'fumadocs-core/mdx-plugins';
import {
  createGetUrl,
  type FileInfo,
  getSlugs,
  parseFilePath,
} from 'fumadocs-core/source';
import { type AdvancedIndex } from 'fumadocs-core/search/server';
import { type GetFilesOptions, getLocalFiles } from '@/github/helper/get-files';

export interface BuildIndexesOptions
  extends Omit<GetFilesOptions, 'keepContent'> {
  /**
   * Base url of docs
   *
   * @defaultValue '/'
   */
  baseUrl?: string;

  slug?: (info: FileInfo) => string[];
  url?: (slugs: string[], locale?: string) => string;
}

/**
 * This script must be executed every time the MDX files are changed to ensure search indexes are up-to-date.
 *
 * We recommend using 3rd party solutions like Algolia Search to handle search indexes
 */
export async function buildSearchIndexes(
  options: BuildIndexesOptions,
): Promise<AdvancedIndex[]> {
  const {
    slug = getSlugs,
    baseUrl = '/',
    url = createGetUrl(baseUrl),
    ...rest
  } = options;
  const files = await getLocalFiles({
    ...rest,
    keepContent: true,
  });

  const output: AdvancedIndex[] = [];

  files.forEach((file) => {
    if (file.type !== 'page' || !file.data.data.content) return;

    const info = parseFilePath(file.path);
    const structuredData = structure(file.data.data.content);

    output.push({
      title: (file.data as unknown as { title: string }).title,
      id: file.path,
      structuredData,
      url: url(slug(info), info.locale),
    });
  });

  return output;
}
