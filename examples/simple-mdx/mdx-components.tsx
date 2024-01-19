import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx/default';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...components,
  };
}
