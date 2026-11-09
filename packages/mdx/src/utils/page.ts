import { createElement } from 'react';
import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';
import { readStructuredData, renderStructuredData } from '../../../shared/structured-data';

/** the exports of a compiled page for its props, with its outputs for them */
export type PageAt<Page extends CompiledMDXProperties<unknown>> = Omit<
  Page,
  'toc' | 'structuredData' | 'extractedReferences'
> & {
  toc: TOCItemType[];
  /** read without rendering, components stay as tags: {@link loadStructuredData} renders them */
  structuredData: StructuredData;
  extractedReferences?: ExtractedReference[];
};

/** the exports of a compiled page for its props: path params and custom props, the content and its outputs read them */
export function pageAt<Page extends CompiledMDXProperties<unknown>>(
  page: Page,
  props: Record<string, unknown>,
): PageAt<Page> {
  const { toc, structuredData, extractedReferences: refs, _markdown: markdown } = page;
  // without props, the content is the compiled component
  const bound = Object.keys(props).length > 0;
  return {
    ...page,
    default: bound
      ? (own: MDXProps) => createElement(page.default, { ...props, ...own })
      : page.default,
    toc: typeof toc === 'function' ? toc(props) : toc,
    // read when asked, async entries render it instead
    get structuredData() {
      return typeof structuredData === 'function'
        ? readStructuredData(structuredData, props)
        : structuredData;
    },
    extractedReferences: typeof refs === 'function' ? refs(props) : refs,
    // called in place, so `asMarkdown()` of the component opts in when rendering into Markdown
    _markdown:
      typeof markdown === 'function' && bound
        ? (own: MDXProps) => markdown({ ...props, ...own })
        : markdown,
  };
}

/** the structured data of a compiled page for its props, with its components rendered */
export async function loadStructuredData(
  { structuredData }: CompiledMDXProperties<unknown>,
  props: Record<string, unknown>,
): Promise<StructuredData> {
  return typeof structuredData === 'function'
    ? renderStructuredData(structuredData, props)
    : structuredData;
}
