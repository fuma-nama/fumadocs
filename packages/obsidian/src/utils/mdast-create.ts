import type { BlockContent, DefinitionContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

export function createCallout(
  type: string,
  title: (BlockContent | DefinitionContent)[],
  children: (BlockContent | DefinitionContent)[],
): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'type',
        value: type,
      },
    ],
    name: 'ObsidianCallout',
    children: [
      {
        type: 'mdxJsxFlowElement',
        name: 'ObsidianCalloutTitle',
        attributes: [],
        children: title,
      },
      {
        type: 'mdxJsxFlowElement',
        name: 'ObsidianCalloutBody',
        attributes: [],
        children,
      },
    ],
  };
}
