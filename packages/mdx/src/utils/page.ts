import { createElement } from 'react';
import type { MDXProps } from 'mdx/types';
import type { Params } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import { renderStructuredData } from '../../../shared/structured-data';

/** the exports of a compiled page at params, its outputs are resolved */
export type PageAt<Page extends CompiledMDXProperties<unknown>> = Omit<
  Page,
  'toc' | 'structuredData'
> & {
  toc: TOCItemType[];
  structuredData: () => Promise<StructuredData>;
};

/** the exports of a compiled page at params, the content and its outputs read them as props */
export function pageAt<Page extends CompiledMDXProperties<unknown>>(
  page: Page,
  params: Params,
): PageAt<Page> {
  const { toc, structuredData, _markdown: markdown } = page;
  // without params, the content is the compiled component
  const bound = Object.keys(params).length > 0;
  return {
    ...page,
    default: bound
      ? (props: MDXProps) => createElement(page.default, { ...params, ...props })
      : page.default,
    toc: toc(params),
    structuredData: () => renderStructuredData(structuredData(params)),
    // called in place, so `asMarkdown()` of the component opts in when rendering into Markdown
    _markdown:
      markdown && bound ? (props: MDXProps) => markdown({ ...params, ...props }) : markdown,
  };
}
