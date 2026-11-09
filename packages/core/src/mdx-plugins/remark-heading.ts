import Slugger from 'github-slugger';
import type { Heading, Root, RootContent } from 'mdast';
import type { Transformer } from 'unified';
import type { TOCItemType } from '@/toc';
import { flattenNode, toEsm } from '@/mdx-plugins/utils';
import { showCondition } from '../../../shared/code-output';
import { headingIdCode, headingIdRegex, idCodeProperty } from '../../../shared/heading-id';

export interface RemarkHeadingOptions {
  slug?: (root: Root, heading: Heading, text: string) => string;

  /**
   * Allow custom headings ids
   *
   * @defaultValue true
   */
  customId?: boolean;

  /**
   * Attach an array of `TOCItemType` to `file.data.toc`
   *
   * @defaultValue true
   */
  generateToc?: boolean;
}

declare module 'vfile' {
  interface DataMap {
    /**
     * [Fumadocs: remark-heading] output data.
     */
    toc?: TOCItemType[];
  }
}

/**
 * Add heading ids and extract TOC. With the default slugs, IDs of headings with authored expressions or in branches of
 * `<show>` render from code.
 */
export function remarkHeading({
  slug,
  customId = true,
  generateToc = true,
}: RemarkHeadingOptions = {}): Transformer<Root, Root> {
  let slugger: Slugger | undefined;
  const defaultSlug = !slug;

  if (!slug) {
    slugger = new Slugger();
    slug = (_root, _heading, text) => slugger!.slug(text);
  }

  return (root, file) => {
    const toc: TOCItemType[] = [];
    const ids = headingIdCode();
    slugger?.reset();

    const visit = (heading: RootContent, when: string[]) => {
      if (heading.type !== 'heading') {
        const condition = showCondition(heading);
        if ('children' in heading)
          for (const child of heading.children)
            visit(child, condition ? [...when, condition] : when);
        return;
      }
      heading.data ||= {};
      heading.data.hProperties ||= {};
      const props = heading.data.hProperties;

      const lastNode = heading.children.at(-1);
      if (lastNode?.type === 'text' && customId) {
        const match = headingIdRegex.exec(lastNode.value);

        if (match?.[1]) {
          props.id = match[1];
          lastNode.value = lastNode.value.slice(0, match.index);
        }
      }

      let flattened: string | null = null;
      if (!props.id) {
        flattened ??= flattenNode(heading);

        props.id = slug(root, heading, flattened);
        const code = defaultSlug && ids.next(heading.children, when);
        if (code) props[idCodeProperty] = code;
      }

      if (generateToc) {
        toc.push({
          title: flattened ?? flattenNode(heading),
          url: `#${props.id}`,
          depth: heading.depth,
        });
      }
    };
    for (const child of root.children) visit(child, []);

    if (ids.esm) root.children.unshift(toEsm(ids.esm));
    if (generateToc) file.data.toc = toc;
  };
}
