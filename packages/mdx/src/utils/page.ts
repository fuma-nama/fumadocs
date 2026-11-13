import { createElement, use, type FC, type ReactPromise } from 'react';
import type { MDXContent, MDXProps } from 'mdx/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';
import { readStructuredData } from '../../../shared/structured-data';

type Props = Record<string, unknown>;

/** the outputs of a compiled page for its props */
export interface PageOutputs {
  toc: TOCItemType[];
  structuredData: StructuredData;
  extractedReferences?: ExtractedReference[];
}

/** the exports of a compiled page for its props, with its outputs for them */
export type PageAt<Page extends CompiledMDXProperties<unknown>> = {
  // mapped, as `Omit` only keeps the index signature of a page that has one
  [K in keyof Page as Exclude<K, keyof PageOutputs>]: Page[K];
} & PageOutputs;

/** merge objects like a spread, without reading the outputs of {@link defineOutputs} */
export function merge<T>(...sources: (object | undefined)[]): T {
  const out = {};
  for (const source of sources)
    if (source) Object.defineProperties(out, Object.getOwnPropertyDescriptors(source));
  return out as T;
}

/** the content of a compiled page with props, the compiled component without them */
export function bind(component: FC<MDXProps>, props?: Props): FC<MDXProps> {
  return props && Object.keys(props).length > 0
    ? (own) => createElement(component, { ...props, ...own })
    : component;
}

/**
 * Define the outputs of a compiled page for its props on `target`, computed when first read: the outputs of a page run
 * its code, the entry of a dynamic file has no params to run it with, and most pages are never asked for all.
 */
export function defineOutputs<T extends object>(
  target: T,
  { toc, structuredData, extractedReferences: refs }: CompiledMDXProperties<unknown>,
  props: Props = {},
): T & PageOutputs {
  lazy(target, 'toc', () => (typeof toc === 'function' ? toc(props) : toc));
  lazy(target, 'structuredData', () =>
    typeof structuredData === 'function'
      ? readStructuredData(structuredData, props)
      : structuredData,
  );
  lazy(target, 'extractedReferences', () => (typeof refs === 'function' ? refs(props) : refs));
  return target as T & PageOutputs;
}

function lazy(target: object, key: keyof PageOutputs, get: () => unknown) {
  let read = false;
  let value: unknown;
  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get() {
      if (!read) {
        value = get();
        read = true;
      }
      return value;
    },
  });
}

/** the exports of a compiled page for its props: path params and custom props, the content and its outputs read them */
export function pageAt<Page extends CompiledMDXProperties<unknown>>(
  page: Page,
  props?: Props,
): PageAt<Page> {
  const { _markdown: markdown } = page;
  return defineOutputs(
    {
      ...page,
      default: bind(page.default, props),
      // called in place, so `asMarkdown()` of the component opts in when rendering into Markdown
      _markdown:
        typeof markdown === 'function' && props && Object.keys(props).length > 0
          ? (own: MDXProps) => markdown({ ...props, ...own })
          : markdown,
    },
    page,
    props,
  );
}

/** a promise that React `use()` reads without suspending once it settles */
export function track<T>(promise: Promise<T>): Promise<T> & ReactPromise<T> {
  promise.then(
    (value) => Object.assign(promise, { status: 'fulfilled', value }),
    (reason: unknown) => Object.assign(promise, { status: 'rejected', reason }),
  );
  return promise;
}

/** the methods of an async entry of the macro in the browser, its content renders synchronously once loaded */
export function browserMethods(load: () => ReactPromise<{ body: MDXContent }>) {
  function Body(props: MDXProps) {
    const loaded = load();
    return createElement((loaded.status === 'fulfilled' ? loaded.value : use(loaded)).body, props);
  }

  return {
    async preload() {
      await load();
    },
    body: Body,
  };
}
