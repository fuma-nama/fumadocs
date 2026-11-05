import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
  } satisfies MDXComponents;
}

// for the Fumadocs integration, `wrapper` gives the content its prose styles
export default getMDXComponents({ wrapper: DocsBody });
