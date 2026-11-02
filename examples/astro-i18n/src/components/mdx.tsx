import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DynamicLink } from 'fumadocs-core/dynamic-link';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // links with the locale, like `/[lang]/docs`
    DynamicLink,
    ...components,
  } satisfies MDXComponents;
}

export default getMDXComponents();
