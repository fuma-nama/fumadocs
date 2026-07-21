import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { ReactNode } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import type { MDXComponents, MDXContent } from 'mdx/types';

export interface MarkdownRenderer<M = Record<string, unknown>> {
  structuredData: StructuredData;
  render: (
    components?: MDXComponents,
    context?: Record<string, unknown>,
  ) => Promise<MarkdownRendererResult<M>>;
  renderSync: (
    components?: MDXComponents,
    context?: Record<string, unknown>,
  ) => MarkdownRendererResult<M>;
  /** JSON-serializable, rebuild it on the client with {@link fromSerialized} */
  serialize: () => MarkdownRendererSerializedOptions;
}

export interface MarkdownRendererResult<M = Record<string, unknown>> {
  exports: M;
  toc: TOCItemType[];
  body: ReactNode;
}

export type MarkdownRendererSerializedOptions = {
  type: 'js';
} & MarkdownRendererJSOptions;

export interface MarkdownRendererJSOptions {
  /** compiled `function-body` JavaScript. */
  code: string;
  filePath: string;
  baseUrl?: string;
  structuredData?: StructuredData;
}

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(async function () {}).constructor;

interface CompiledExports {
  toc?: TOCItemType[];
  default: MDXContent;
}

export function fromJS<M>(options: MarkdownRendererJSOptions): MarkdownRenderer<M> {
  const {
    code,
    structuredData = {
      headings: [],
      contents: [],
    },
    baseUrl,
  } = options;

  // output reads its runtime from `arguments[0]`, so `opts` must stay first
  function createScope(context?: Record<string, unknown>) {
    const { opts, ...rest } = context ?? {};

    return {
      opts: {
        ...(opts as object),
        ...JsxRuntime,
        baseUrl,
      },
      ...rest,
    };
  }

  function toResult(out: CompiledExports & M, components?: MDXComponents) {
    return {
      toc: out.toc ?? [],
      body: JsxRuntime.jsx(out.default, { components }),
      exports: out,
    };
  }

  return {
    structuredData,
    async render(components, context) {
      const scope = createScope(context);
      const hydrateFn = new AsyncFunction(...Object.keys(scope), code);
      const out = (await hydrateFn.apply(hydrateFn, Object.values(scope))) as CompiledExports & M;

      return toResult(out, components);
    },
    renderSync(components, context) {
      const scope = createScope(context);
      const hydrateFn = new Function(...Object.keys(scope), code);
      const out = hydrateFn.apply(hydrateFn, Object.values(scope)) as CompiledExports & M;

      return toResult(out, components);
    },
    serialize() {
      return { type: 'js', ...options };
    },
  };
}

export function fromSerialized<M>(options: MarkdownRendererSerializedOptions): MarkdownRenderer<M> {
  return fromJS(options);
}
