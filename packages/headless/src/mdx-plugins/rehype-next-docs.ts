import Slugger from 'github-slugger';
import type { Element, Root } from 'hast';
import rehypePrettycode, {
  type Options as RehypePrettyCodeOptions,
} from 'rehype-pretty-code';
import type { Transformer } from 'unified';
import { flattenNode, visit } from './hast-utils';

const slugger = new Slugger();
const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const customMetaRegex = /custom="(?<value>[^"]+)"/;

const rehypePrettyCodeOptions: RehypePrettyCodeOptions = {
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultLang: {
    block: 'text',
  },
  grid: true,
  keepBackground: false,
  filterMetaString(s) {
    return s.replace(customMetaRegex, '');
  },
};

export interface RehypeNextDocsOptions {
  codeOptions?: RehypePrettyCodeOptions;
}

/**
 * Handle codeblocks and heading slugs
 */
export function rehypeNextDocs({
  codeOptions,
}: RehypeNextDocsOptions = {}): Transformer<Root, Root> {
  return async (tree, vfile) => {
    slugger.reset();

    visit(tree, ['pre', ...headings], (node) => {
      if (headings.includes(node.tagName)) {
        if (!('id' in node.properties)) {
          node.properties.id = slugger.slug(flattenNode(node));
        }

        return;
      }

      if (node.tagName === 'pre') {
        const codeEl = node.children[0] as Element;

        // Allow custom code meta
        if (
          codeEl.data &&
          'meta' in codeEl.data &&
          typeof codeEl.data.meta === 'string'
        ) {
          // @ts-expect-error -- custom properties
          node.nd_custom = customMetaRegex.exec(codeEl.data.meta)?.[1];
        }
      }
    });

    const plugin = rehypePrettycode({
      ...rehypePrettyCodeOptions,
      ...codeOptions,
    }) as Transformer<Root, Root>;

    await plugin(tree, vfile, () => {
      // do nothing
    });

    visit(tree, ['figure', 'pre'], (node) => {
      // Remove default fragment element
      // Add title to pre element
      if ('data-rehype-pretty-code-figure' in node.properties) {
        const titleNode = node.children.find(
          (child) => child.type === 'element' && child.tagName === 'figcaption',
        ) as Element | undefined;
        const preNode = node.children.find(
          (child) => child.type === 'element' && child.tagName === 'pre',
        ) as Element | undefined;

        if (!preNode) return;

        if (titleNode) {
          preNode.properties.title = flattenNode(titleNode);
        }

        Object.assign(node, preNode);
      }

      // @ts-expect-error -- Add custom meta to properties
      node.properties.custom = node.nd_custom as unknown;
    });
  };
}
