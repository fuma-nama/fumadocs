import type { MDXComponents } from 'mdx/types';
import defaultComponents from '@maximai/fumadocs-ui/mdx';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...components,
  };
}
