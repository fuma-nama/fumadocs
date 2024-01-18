import type { MDXComponents } from 'mdx/types';
import defaultComponents from '@fuma-docs/ui/mdx/default';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...components,
  };
}
