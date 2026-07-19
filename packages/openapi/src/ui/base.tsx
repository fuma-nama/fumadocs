'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import type { Document, RenderContext } from '@/types';
import { defaultAdapters } from '@/requests/media/adapter';
import {
  Children,
  type ComponentProps,
  type ReactElement,
  useMemo,
  type FC,
  type ReactNode,
} from 'react';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { Operation } from '@/ui/operation';
import { ServerProvider, useRenderContext } from './contexts/api';
import { generate } from '@fumari/json-schema-ts';
import { ClientCodeBlock } from './components/codeblock';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { AuthProvider } from '@/playground/auth';
import { registerDefault } from '@/requests/generators/all';
import { createCodeUsageGeneratorRegistry } from '@/requests/generators';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { GeneratedPageProps } from '@/utils/pages/builder';
import { Markdown } from './components/markdown';
import { Schema, type SchemaUIOptions } from '@fumadocs/api-docs/components/schema';
import { RenderContextProvider } from './contexts/api';
import type { CreateOpenAPIPageOptions, OpenAPIPageProps } from '.';

/**
 * Create `<OpenAPIPage />` (a client component) without the full Shiki bundle.
 */
export function createOpenAPIPageBase({
  shiki,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  schemaUI: schemaUIOptions,
  codeUsages = registerDefault(createCodeUsageGeneratorRegistry()),
  generateTypeScriptDefinitions = (schema, ctx) => {
    if (typeof schema !== 'object') return;

    try {
      // `generate` resolves `$ref`s against the schema root itself,
      // spread the bundled document into the root so in-document refs are resolvable
      return generate(
        { ...(ctx.ctx.schema.bundled as object), ...getRaw(schema) },
        {
          name: ctx.name,
          readOnly: ctx.readOnly,
          writeOnly: ctx.writeOnly,
        },
      );
    } catch (e) {
      console.warn('Failed to generate typescript schema:', e);
    }
  },
  ...options
}: CreateOpenAPIPageOptions & { shiki: ShikiFactory }): FC<OpenAPIPageProps> {
  let processor: ReturnType<typeof createMarkdownProcessor>;

  function createMarkdownProcessor() {
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

  return function OpenAPIPage(props) {
    let doc: Document;
    let proxyUrl: string | undefined;
    if ('preloaded' in props) {
      doc = props.preloaded.docs[props.document];
      if (!doc)
        throw new Error(
          `[Fumadocs OpenAPI] the document ${props.document} is not preloaded, make sure to pass the "preloaded" prop to <OpenAPIPage />`,
        );
      proxyUrl = props.preloaded.proxyUrl;
    } else {
      doc = props.payload.bundled;
      proxyUrl = props.payload.proxyUrl;
    }

    const processed = useMemo(() => dereferenceBundledDocument(doc), [doc]);

    const ctx: RenderContext = useMemo(() => {
      const schemaUIShared = {
        renderCodeblock(opts) {
          return <ClientCodeBlock {...opts} />;
        },
        renderMarkdown(md) {
          return <Markdown md={md} />;
        },
      } satisfies Partial<SchemaUIOptions>;

      return {
        schema: processed,
        proxyUrl,
        shiki,
        shikiOptions,
        generateTypeScriptDefinitions,
        codeUsages,
        SchemaUI(props) {
          if (schemaUIOptions?.render) return schemaUIOptions.render(props, ctx);
          return (
            <Schema
              {...schemaUIShared}
              {...props}
              showExample={props.showExample ?? schemaUIOptions?.showExample}
            />
          );
        },
        ...options,
        _default_processMarkdown(md) {
          processor ??= createMarkdownProcessor();
          return processor.processSync(md).result as ReactNode;
        },
        mediaAdapters: {
          ...defaultAdapters,
          ...options.mediaAdapters,
        },
      };
    }, [proxyUrl, processed]);

    return (
      <RenderContextProvider ctx={ctx}>
        <PageContent {...props} />
      </RenderContextProvider>
    );
  };
}

function PageContent({
  showTitle: hasHead = false,
  showDescription,
  operations,
  webhooks,
}: Omit<GeneratedPageProps, 'document'>) {
  const ctx = useRenderContext();
  const { dereferenced, resolve } = ctx.schema;
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm @container">
      {slots.operations?.map((op) => op.children)}
      {slots.webhooks?.map((op) => op.children)}
    </div>
  );

  let content = renderPageLayout(
    {
      operations: operations?.map((item) => {
        const pathItem = resolve(dereferenced.paths?.[item.path]);
        if (!pathItem)
          throw new Error(`[Fumadocs OpenAPI] Path not found in OpenAPI schema: ${item.path}`);

        const operation = pathItem[item.method];
        if (!operation)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in operation: ${item.path}`,
          );

        return {
          item,
          children: (
            <Operation
              key={`${item.path}:${item.method}`}
              method={item.method}
              pathItem={pathItem}
              operation={operation}
              path={item.path}
              showTitle={hasHead}
              showDescription={showDescription}
            />
          ),
        };
      }),
      webhooks: webhooks?.map((item) => {
        const webhook = resolve(dereferenced.webhooks?.[item.name]);
        if (!webhook)
          throw new Error(`[Fumadocs OpenAPI] Webhook not found in OpenAPI schema: ${item.name}`);

        const hook = webhook[item.method];
        if (!hook)
          throw new Error(
            `[Fumadocs OpenAPI] Method ${item.method} not found in webhook: ${item.name}`,
          );

        return {
          item,
          children: (
            <Operation
              type="webhook"
              key={`${item.name}:${item.method}`}
              method={item.method}
              pathItem={webhook}
              operation={hook}
              path={`/${item.name}`}
              showTitle={hasHead}
              showDescription={showDescription}
            />
          ),
        };
      }),
    },
    ctx,
  );

  if (ctx.playground?.enabled !== false) {
    content = ctx.playground?.provider ? (
      ctx.playground.provider({ children: content })
    ) : (
      <AuthProvider>{content}</AuthProvider>
    );
  }

  return <ServerProvider servers={dereferenced.servers}>{content}</ServerProvider>;
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
