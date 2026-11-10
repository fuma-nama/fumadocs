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

/**
 * Define properties that are computed when first read. The outputs of a page run its code, so binding a page computes
 * none of them: the entry of a dynamic file has no params to run it with, and most pages are never asked for all.
 */
export function lazy<T extends object, G extends Record<string, () => unknown>>(
  target: T,
  getters: G,
): T & { [K in keyof G]: ReturnType<G[K]> } {
  for (const key in getters) {
    let read = false;
    let value: unknown;
    Object.defineProperty(target, key, {
      enumerable: true,
      configurable: true,
      get() {
        if (!read) {
          value = getters[key]();
          read = true;
        }
        return value;
      },
    });
  }
  return target as never;
}

/** merge objects like a spread, without reading their {@link lazy} properties */
export function merge<T>(...sources: (object | undefined)[]): T {
  const out = {};
  for (const source of sources)
    if (source) Object.defineProperties(out, Object.getOwnPropertyDescriptors(source));
  return out as T;
}

/** the exports of a compiled page for its props: path params and custom props, the content and its outputs read them */
export function pageAt<Page extends CompiledMDXProperties<unknown>>(
  page: Page,
  props: Record<string, unknown>,
): PageAt<Page> {
  const { toc, structuredData, extractedReferences: refs, _markdown: markdown } = page;
  // without props, the content is the compiled component
  const bound = Object.keys(props).length > 0;
  return lazy(
    {
      ...page,
      default: bound
        ? (own: MDXProps) => createElement(page.default, { ...props, ...own })
        : page.default,
      // called in place, so `asMarkdown()` of the component opts in when rendering into Markdown
      _markdown:
        typeof markdown === 'function' && bound
          ? (own: MDXProps) => markdown({ ...props, ...own })
          : markdown,
    },
    {
      toc: () => (typeof toc === 'function' ? toc(props) : toc),
      structuredData: () =>
        typeof structuredData === 'function'
          ? readStructuredData(structuredData, props)
          : structuredData,
      extractedReferences: () => (typeof refs === 'function' ? refs(props) : refs),
    },
  );
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
