import { createElement } from 'react';
import type { MDXProps } from 'mdx/types';
import type { Params } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';
import { renderStructuredData } from '../../../shared/structured-data';

/** the exports of a compiled page at params, its outputs are resolved */
export type PageAt<Page extends CompiledMDXProperties<unknown>> = Omit<
  Page,
  'toc' | 'structuredData' | 'extractedReferences'
> & {
  toc: TOCItemType[];
  structuredData: StructuredData | (() => Promise<StructuredData>);
  extractedReferences?: ExtractedReference[];
};

/** the exports of a compiled page at params, the content and its outputs read them as props */
export function pageAt<Page extends CompiledMDXProperties<unknown>>(
  page: Page,
  params: Params,
): PageAt<Page> {
  const { toc, structuredData, extractedReferences: refs, _markdown: markdown } = page;
  // without params, the content is the compiled component
  const bound = Object.keys(params).length > 0;
  return {
    ...page,
    default: bound
      ? (props: MDXProps) => createElement(page.default, { ...params, ...props })
      : page.default,
    toc: typeof toc === 'function' ? toc(params) : toc,
    structuredData:
      typeof structuredData === 'function'
        ? () => renderStructuredData(structuredData(params))
        : structuredData,
    extractedReferences: typeof refs === 'function' ? refs(params) : refs,
    // called in place, so `asMarkdown()` of the component opts in when rendering into Markdown
    _markdown:
      typeof markdown === 'function' && bound
        ? (props: MDXProps) => markdown({ ...params, ...props })
        : markdown,
  };
}
