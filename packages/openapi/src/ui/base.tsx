'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import {
  Children,
  type ComponentProps,
  type FC,
  type ReactElement,
  type ReactNode,
  useMemo,
} from 'react';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Heading } from 'fumadocs-ui/components/heading';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { useAnchorId } from '@fumadocs/api-docs/auto-anchor/client';
import { Schema, type SchemaUIOptions } from '@fumadocs/api-docs/components/schema';
import { createOpenAPIPage, type OpenAPIRuntime, useOpenAPI } from '@/headless';
import type { RenderContext } from '@/types';
import { Operation } from '@/ui/operation';
import { Markdown } from '@/ui/components/markdown';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import type { CreateOpenAPIPageOptions, OpenAPIPageProps } from '.';

let processor: ReturnType<typeof createProcessor>;

function createProcessor() {
  const mdxComponents = {
    ...defaultMdxComponents,
    img: undefined,
    pre: MarkdownPre,
  };

  function rehypeReact(this: any) {
    this.compiler = (tree: any, file: any) => {
      return toJsxRuntime(tree, {
        development: false,
        filePath: file.path,
        ...JsxRuntime,
        components: mdxComponents,
      });
    };
  }

  return remark().use(remarkGfm).use(remarkRehype).use(rehypeReact);
}

function MarkdownPre(props: ComponentProps<'pre'>) {
  const code = Children.only(props.children) as ReactElement;
  const codeProps = code.props as ComponentProps<'code'>;
  const content = codeProps.children;
  if (typeof content !== 'string') return null;

  const lang =
    codeProps.className
      ?.split(' ')
      .find((v) => v.startsWith('language-'))
      ?.slice('language-'.length) ?? 'text';

  return <ClientCodeBlock lang={lang} code={content.trimEnd()} />;
}

function DefaultMarkdown({ md }: { md: string }) {
  return useMemo(() => {
    processor ??= createProcessor();
    return processor.processSync(md).result as ReactNode;
  }, [md]);
}

const renderMarkdown = (md: string) => <Markdown md={md} />;
const renderCodeblock: SchemaUIOptions['renderCodeblock'] = (props) => (
  <ClientCodeBlock {...props} />
);

/**
 * Create `<OpenAPIPage />` (a client component) without the full Shiki bundle.
 */
export function createOpenAPIPageBase(
  options: CreateOpenAPIPageOptions & { shiki: ShikiFactory },
): FC<OpenAPIPageProps> {
  const {
    shiki,
    shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
    components = {},
  } = options;
  const { Operation: OperationUI = Operation, SchemaUI = Schema } = components;
  const contexts = new WeakMap<OpenAPIRuntime, RenderContext>();

  function useRenderContext(): RenderContext {
    const runtime = useOpenAPI();
    let ctx = contexts.get(runtime);
    if (!ctx) {
      ctx = { ...options, shikiOptions, schema: runtime.doc, proxyUrl: runtime.proxyUrl };
      contexts.set(runtime, ctx);
    }

    return ctx;
  }

  return createOpenAPIPage({
    codeUsages: options.codeUsages,
    generateCodeSamples: options.generateCodeSamples,
    generateTypeScriptDefinitions: options.generateTypeScriptDefinitions,
    mediaAdapters: options.mediaAdapters,
    storageKeyPrefix: options.storageKeyPrefix,
    components: {
      Heading({ id, depth, ...props }) {
        const anchorId = useAnchorId([id]);
        if (components.Heading)
          return <components.Heading id={anchorId} depth={depth} {...props} />;

        return <Heading id={anchorId} as={`h${depth}` as 'h1'} {...props} />;
      },
      CodeBlock:
        components.CodeBlock ??
        ((props) => (
          <DynamicCodeBlock
            highlighter={() => shiki.getOrInit()}
            options={shikiOptions}
            {...props}
          />
        )),
      Markdown: components.Markdown ?? DefaultMarkdown,
      SchemaUI(props) {
        return (
          <SchemaUI
            renderMarkdown={renderMarkdown}
            renderCodeblock={renderCodeblock}
            {...props}
            showExample={props.showExample ?? options.schemaUI?.showExample}
          />
        );
      },
      Operation(props) {
        return <OperationUI {...props} ctx={useRenderContext()} />;
      },
      Layout(props) {
        const ctx = useRenderContext();
        if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(props, ctx);

        return (
          <div className="flex flex-col gap-24 text-sm @container">
            {props.operations?.map((item) => item.children)}
            {props.webhooks?.map((item) => item.children)}
          </div>
        );
      },
    },
  });
}
