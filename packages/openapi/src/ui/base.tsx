'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import type { Document, RenderContext } from '@/types';
import { defaultAdapters } from '@/requests/media/adapter';
import {
  Children,
  type ComponentProps,
  type ReactElement,
  useMemo,
  useRef,
  type FC,
  type ReactNode,
} from 'react';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { Heading as BaseHeading } from 'fumadocs-ui/components/heading';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock.core';
import { useAnchorId } from '@fumadocs/api-docs/auto-anchor/client';
import {
  Operation,
  type OperationLegacyOptions,
  type OperationPlaygroundOptions,
} from '@/ui/operation';
import { useOperationState } from '@/ui/operation/context';
import type { RawRequestData, RequestData } from '@/requests/types';
import type { ExampleRequestItem } from '@/utils/get-example-requests';
import {
  type OpenAPIComponents,
  RenderContextProvider,
  ServerProvider,
  useRenderContext,
} from './contexts/api';
import { ClientCodeBlock } from './components/codeblock';
import { Markdown } from './components/markdown';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import { AuthProvider } from '@/playground/auth';
import { registerDefault } from '@/requests/generators/all';
import { createCodeUsageGeneratorRegistry } from '@/requests/generators';
import { defaultTypeScriptDefinitions } from '@/headless';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { GeneratedPageProps } from '@/utils/pages/builder';
import { Schema, type SchemaUIOptions } from '@fumadocs/api-docs/components/schema';
import type { CreateOpenAPIPageOptions, OpenAPIPageProps } from '.';

/**
 * Create `<OpenAPIPage />` (a client component) without the full Shiki bundle.
 */
export function createOpenAPIPageBase({
  shiki,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  schemaUI: schemaUIOptions,
  codeUsages = registerDefault(createCodeUsageGeneratorRegistry()),
  generateTypeScriptDefinitions = defaultTypeScriptDefinitions,
  components: overrides = {},
  renderHeading,
  renderCodeBlock,
  renderMarkdown,
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

  function processMarkdown(md: string) {
    processor ??= createMarkdownProcessor();
    return processor.processSync(md).result as ReactNode;
  }

  // the deprecated `render*` and `components` options are merged into the component slots
  const components: Omit<OpenAPIComponents, 'SchemaUI'> = {
    Heading({ id: _id, depth, ...props }) {
      const id = useAnchorId([_id]);
      if (renderHeading) return renderHeading({ id, ...props }, depth);
      if (overrides.Heading) return <overrides.Heading id={id} depth={depth} {...props} />;

      return <BaseHeading id={id} as={`h${depth}` as 'h1'} {...props} />;
    },
    CodeBlock(props) {
      if (renderCodeBlock) return renderCodeBlock(props);
      if (overrides.CodeBlock) return <overrides.CodeBlock {...props} />;

      return (
        <DynamicCodeBlock highlighter={() => shiki.getOrInit()} options={shikiOptions} {...props} />
      );
    },
    Markdown({ md }) {
      if (renderMarkdown) return renderMarkdown(md);
      if (overrides.Markdown) return <overrides.Markdown md={md} />;

      return useMemo(() => processMarkdown(md), [md]);
    },
  };

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
        components: overrides,
        renderHeading,
        renderCodeBlock,
        renderMarkdown,
        SchemaUI(props) {
          const merged: SchemaUIOptions = {
            ...schemaUIShared,
            ...props,
            showExample: props.showExample ?? schemaUIOptions?.showExample,
          };
          if (overrides.SchemaUI) return <overrides.SchemaUI {...merged} />;
          if (schemaUIOptions?.render) return schemaUIOptions.render(merged, ctx);
          return <Schema {...merged} />;
        },
        ...options,
        _default_processMarkdown: processMarkdown,
        mediaAdapters: {
          ...defaultAdapters,
          ...options.mediaAdapters,
        },
      };
    }, [proxyUrl, processed]);

    return (
      <RenderContextProvider ctx={ctx} components={{ ...components, SchemaUI: ctx.SchemaUI }}>
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
  const { Operation: OperationComp = Operation } = ctx.components ?? {};
  let { renderPageLayout } = ctx.content ?? {};
  renderPageLayout ??= (slots) => (
    <div className="flex flex-col gap-24 text-sm @container">
      {slots.operations?.map((op) => op.children)}
      {slots.webhooks?.map((op) => op.children)}
    </div>
  );
  const legacy: OperationLegacyOptions = {
    ctx,
    content: ctx.content,
    UsageTabs: ctx.content?.renderAPIExampleUsageTabs && LegacyUsageTabs,
    ExampleSelector: ctx.operation?.APIExampleSelector && LegacyExampleSelector,
    RequestTabs: ctx.content?.renderRequestTabs && LegacyRequestTabs,
  };
  const { provider, render, ...playgroundOptions } = ctx.playground ?? {};
  const playground: OperationPlaygroundOptions = {
    ...playgroundOptions,
    render: render && ((props) => render({ ...props, ctx })),
  };

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
            <OperationComp
              key={`${item.path}:${item.method}`}
              method={item.method}
              pathItem={pathItem}
              operation={operation}
              path={item.path}
              showTitle={hasHead}
              showDescription={showDescription}
              showResponseSchema={ctx.showResponseSchema}
              playground={playground}
              legacy={legacy}
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
            <OperationComp
              type="webhook"
              key={`${item.name}:${item.method}`}
              method={item.method}
              pathItem={webhook}
              operation={hook}
              path={`/${item.name}`}
              showTitle={hasHead}
              showDescription={showDescription}
              showResponseSchema={ctx.showResponseSchema}
              playground={playground}
              legacy={legacy}
            />
          ),
        };
      }),
    },
    ctx,
  );

  if (ctx.playground?.enabled !== false) {
    content = provider ? provider({ children: content }) : <AuthProvider>{content}</AuthProvider>;
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

type ExampleUpdateListener = (data: RawRequestData, encoded: RequestData) => void;

/** @deprecated use `useOperation()`, `useExampleRequests()` and `useExampleRequest()` from `fumadocs-openapi/headless` */
export function useOperationContext() {
  const state = useOperationState();
  const legacyListeners = useRef(new WeakMap<ExampleUpdateListener, () => void>());

  return useMemo(() => {
    const { path, security, ...info } = state.info;
    const active = () => state.examples.find((item) => item.id === state.example)!;

    return {
      ...info,
      route: path,
      securities: security,
      codeUsages: state.codeUsages,
      examples: state.examples as ExampleRequestItem[],
      example: state.example,
      setExample: state.setExample,
      setExampleData: state.update,
      addListener(listener: ExampleUpdateListener) {
        const notify = () => {
          const item = active();
          listener(item.data, item.encoded);
        };
        notify();
        legacyListeners.current.set(listener, notify);
        state.subscribe(notify);
      },
      removeListener(listener: ExampleUpdateListener) {
        const notify = legacyListeners.current.get(listener);
        // the set-based store makes re-subscribing the same function a no-op
        if (notify) state.subscribe(notify)();
      },
    };
  }, [state]);
}

function LegacyUsageTabs() {
  const ctx = useRenderContext();
  const { codeUsages } = useOperationContext();

  return ctx.content!.renderAPIExampleUsageTabs!(codeUsages, ctx);
}

function LegacyExampleSelector() {
  const { operation } = useRenderContext();
  const { examples, example, setExample } = useOperationContext();
  const Selector = operation!.APIExampleSelector!;

  return <Selector items={examples} value={example} onValueChange={setExample} />;
}

function LegacyRequestTabs() {
  const ctx = useRenderContext();
  const { route, examples, method, pathItem, operation } = useOperationContext();

  return ctx.content!.renderRequestTabs!(
    { items: examples, route, method, pathItem, operation },
    ctx,
  );
}
