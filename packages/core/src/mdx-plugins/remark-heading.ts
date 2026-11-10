import Slugger from 'github-slugger';
import type { Heading, Root, RootContent } from 'mdast';
import type { Transformer } from 'unified';
import type { MdxJsxAttributeValueExpression, MdxJsxFlowElement } from 'mdast-util-mdx';
import type { TOCItemType } from '@/toc';
import { flattenNode, toEsm } from '@/mdx-plugins/utils';
import type { Analysis } from '@/mdx-plugins/stringifier';
import { showCondition } from '../../../shared/code-output';
import { headingIdCode, headingIdRegex, headingIdWrapper } from '../../../shared/heading-id';

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

  /**
   * With `static`, IDs are always slugged from the source.
   *
   * @defaultValue the analysis of the content source, or `static`
   */
  analysis?: Analysis;
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
 * Add heading ids and extract TOC. With the default slugs and runtime analysis, IDs of headings with authored
 * expressions or in branches of `<show>` render from code: the heading is wrapped in an element that gives it the ID.
 */
export function remarkHeading({
  slug,
  customId = true,
  generateToc = true,
  analysis,
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
    const fromCode = defaultSlug && (analysis ?? file.data._analysis) === 'runtime';
    slugger?.reset();

    const visit = (nodes: RootContent[], when: string[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const heading = nodes[i];
        if (heading.type !== 'heading') {
          const condition = showCondition(heading);
          if ('children' in heading)
            visit(heading.children as RootContent[], condition ? [...when, condition] : when);
          continue;
        }
        const code = assign(heading, when);
        if (!code) continue;
        (file.data._headingIds ??= {})[heading.data!.hProperties!.id as string] = code;
        const wrapper: MdxJsxFlowElement = { ...headingIdWrapper(code), children: [heading] };
        (wrapper.attributes[0].value as MdxJsxAttributeValueExpression).data = toEsm(code).data;
        nodes[i] = wrapper;
      }
    };
    /** @returns the code of its ID, when it renders from code */
    const assign = (heading: Heading, when: string[]): string | false | undefined => {
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
      let code: string | false | undefined;
      if (!props.id) {
        flattened ??= flattenNode(heading);

        props.id = slug(root, heading, flattened);
        code = fromCode && ids.next(heading.children, when);
      }

      if (generateToc) {
        toc.push({
          title: flattened ?? flattenNode(heading),
          url: `#${props.id}`,
          depth: heading.depth,
        });
      }
      return code;
    };
    visit(root.children, []);

    if (ids.esm) root.children.unshift(toEsm(ids.esm));
    if (generateToc) file.data.toc = toc;
  };
}
