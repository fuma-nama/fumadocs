import Slugger from 'github-slugger';
import type { Heading, Nodes, Root } from 'mdast';
import type * as Hast from 'hast';
import type { Transformer } from 'unified';
import type { ExpressionStatement, JSXElement } from 'estree-jsx';
import { toEstree } from 'hast-util-to-estree';
import type { TOCItemType } from '@/toc';
import { flattenNode, toEsm, walk } from '@/mdx-plugins/utils';
import { walkBranches } from '../../../shared/show';
import { headingIdCode, headingIdRegex } from '../../../shared/heading-id';

export interface RemarkHeadingOptions {
  /** slug the IDs of headings, the IDs slugged when rendering come from `slugImportSource` */
  slug?: (root: Root, heading: Heading, text: string) => string;

  /**
   * The module that slugs IDs when rendering, compiled pages import `createHeadingIds()` from it like the JSX runtime
   * from `jsxImportSource`. It replaces `fumadocs-core/mdx-plugins/remark-heading.runtime`, which it can call with
   * its own slugger.
   *
   * @defaultValue the runtime of Fumadocs, or with a custom `slug`, none: IDs are slugged from the source
   */
  slugImportSource?: string;

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
 * Add heading ids and extract TOC.
 *
 * For a content source that renders pages for props, the IDs of headings with authored expressions or in branches of
 * `<show>` are slugged when rendering: {@link rehypeHeadingIds} gives them to the headings.
 */
export function remarkHeading({
  slug,
  slugImportSource,
  customId = true,
  generateToc = true,
}: RemarkHeadingOptions = {}): Transformer<Root, Root> {
  let slugger: Slugger | undefined;
  // a custom slug needs its own runtime to slug when rendering
  const hasRuntime = !slug || slugImportSource !== undefined;

  if (!slug) {
    slugger = new Slugger();
    slug = (_root, _heading, text) => slugger!.slug(text);
  }

  return (root, file) => {
    const toc: TOCItemType[] = [];
    const ids = headingIdCode(slugImportSource);
    const fromCode = hasRuntime && file.data.unstable_runtimeOutputs;
    slugger?.reset();

    walkBranches<Nodes>(root, (heading, when) => {
      if (heading.type !== 'heading') return;
      const props = ((heading.data ||= {}).hProperties ||= {});

      const lastNode = heading.children.at(-1);
      if (lastNode?.type === 'text' && customId) {
        const match = headingIdRegex.exec(lastNode.value);

        if (match?.[1]) {
          props.id = match[1];
          lastNode.value = lastNode.value.slice(0, match.index);
        }
      }

      let text: string | undefined;
      if (!props.id) {
        text = flattenNode(heading);
        props.id = slug(root, heading, text);
        const code = fromCode && ids.next(heading.children, when);
        if (code) (file.data._headingIds ??= {})[props.id as string] = code;
      }

      if (generateToc) {
        toc.push({
          title: text ?? flattenNode(heading),
          url: `#${props.id}`,
          depth: heading.depth,
        });
      }
      return 'skip';
    });

    if (ids.esm) root.children.unshift(toEsm(ids.esm));
    if (generateToc) file.data.toc = toc;
  };
}

/**
 * Give headings their IDs from code, the IDs that {@link remarkHeading} computes for a content source that renders
 * pages for props. It runs after the plugins that read headings: a heading with an ID from code is JSX.
 */
export function rehypeHeadingIds(): Transformer<Hast.Root, Hast.Root> {
  return (tree, file) => {
    const ids = file.data._headingIds;
    if (!ids) return;
    walk<Hast.Nodes>(tree as Hast.Nodes, (node, index, parent) => {
      const code = node.type === 'element' && ids[node.properties.id as string];
      if (!code || !parent) return;

      const estree = toEstree(node, {
        elementAttributeNameCase: 'react',
        stylePropertyNameCase: 'dom',
      });
      const { expression } = estree.body[0] as { expression: JSXElement };
      for (const attribute of expression.openingElement.attributes)
        if (attribute.type === 'JSXAttribute' && attribute.name.name === 'id')
          attribute.value = {
            type: 'JSXExpressionContainer',
            expression: (toEsm(code).data!.estree!.body[0] as ExpressionStatement).expression,
          };
      parent.children[index!] = {
        type: 'mdxFlowExpression',
        value: '',
        data: { estree },
      } as Hast.Nodes;
      return 'skip';
    });
  };
}
