import { remark } from 'remark';
import { remarkHeading } from '@/mdx-plugins/remark-heading';
import type { PluggableList } from 'unified';
import type { Compatible } from 'vfile';
import type { TOCItemType } from '@/toc';

/**
 * Get Table of Contents from markdown/mdx document (using remark)
 *
 * @param content - Markdown content or file
 */
export function getTableOfContents(content: Compatible): TOCItemType[];

/**
 * Get Table of Contents from markdown/mdx document (using remark)
 *
 * @param content - Markdown content or file
 * @param remarkPlugins - remark plugins to be applied first
 */
export function getTableOfContents(
  content: Compatible,
  remarkPlugins: PluggableList,
): Promise<TOCItemType[]>;

export function getTableOfContents(
  content: Compatible,
  remarkPlugins?: PluggableList,
): TOCItemType[] | Promise<TOCItemType[]> {
  if (remarkPlugins) {
    return remark()
      .use(remarkPlugins)
      .use(remarkHeading)
      .process(content)
      .then((result) => {
        if ('toc' in result.data) return result.data.toc as TOCItemType[];

        return [];
      });
  }

  // compatible with sync usages
  const result = remark().use(remarkHeading).processSync(content);

  if ('toc' in result.data) return result.data.toc as TOCItemType[];
  return [];
}
