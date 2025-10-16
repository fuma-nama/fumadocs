import { defineConfig } from 'fumadocs-mdx/config';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

export { blog, docs } from './source.config';

function remarkElementIds() {
  return (tree: Root, vfile: unknown) => {
    const file = vfile as { data?: { elementIds?: string[] } };
    file.data ??= {};
    file.data.elementIds ??= [];

    visit(tree, 'mdxJsxFlowElement', (element) => {
      if (!element.name || !element.attributes) return;

      const idAttr = element.attributes.find(
        (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'id',
      );

      if (idAttr && typeof idAttr.value === 'string') {
        file.data!.elementIds!.push(idAttr.value);
      }
    });
  };
}

export default defineConfig({
  mdxOptions: {
    valueToExport: ['elementIds', 'toc'],
    remarkNpmOptions: {
      persist: {
        id: 'package-manager',
      },
    },
    remarkHeadingOptions: {
      generateToc: true,
    },
    remarkPlugins: [remarkElementIds],
    rehypePlugins: () => [],
  },
});
