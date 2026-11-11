import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { asMarkdown, jsxComponents } from 'fumadocs-core/server';
import * as HeadingRuntime from 'fumadocs-core/mdx-plugins/remark-heading.runtime';
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
  /** the props of the content, like the params of a page of a dynamic file */
  props?: Record<string, unknown>;
}

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(async function () {}).constructor;

/** the exports of compiled content, its outputs are static or functions of the props */
interface CompiledExports {
  toc?: TOCItemType[] | ((props: Record<string, unknown>) => TOCItemType[]);
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
        // the runtime of heading IDs, unless the scope gives the one of `slugImportSource`
        ...HeadingRuntime,
        ...(opts as object),
        ...JsxRuntime,
        // the runtime of generated code, like the JSX runtime
        asMarkdown,
        jsxComponents,
        baseUrl,
      },
      // the code of the module reads the params of a page as `props`, like its content
      props: options.props ?? {},
      ...rest,
    };
  }

  function toResult(out: CompiledExports & M, components?: MDXComponents) {
    const { toc = [] } = out;
    return {
      toc: typeof toc === 'function' ? toc(options.props ?? {}) : toc,
      body: JsxRuntime.jsx(out.default, { ...options.props, components }),
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
