'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import type { AsyncAPIObject, Awaitable, OperationObject, RenderContext } from '@/types';
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
import { PageContent } from './api-page';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { compile } from '@fumari/json-schema-ts';
import { ClientCodeBlock } from './components/codeblock';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { JSONSchema } from 'json-schema-typed';
import type { CodeToHastOptionsCommon, CodeOptionsThemes, BundledTheme } from 'shiki';
import type { GeneratedPageProps, OperationItem } from '@/utils/pages/builder';
import { ParsedSchema } from '@/utils/schema';
import { Markdown } from './components/markdown';
import { Schema } from '@fumadocs/api-docs/components/schema';
import { RenderContextProvider } from './contexts/api';
import type { NoReference } from '@fumadocs/api-docs/schema';
import type { ExampleMessageItem } from '@/utils/get-example-messages';

export interface GenerateTypeScriptDefinitionsContext {
  readOnly: boolean;
  writeOnly: boolean;
  ctx: RenderContext;
}

export interface CreateAsyncAPIPageOptions {
  generateTypeScriptDefinitions?:
    | ((
        schema: JSONSchema,
        ctx: GenerateTypeScriptDefinitionsContext,
      ) => Awaitable<string | undefined>)
    | false;
  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;
  content?: {
    renderPageLayout?: (
      slots: {
        operations?: {
          item: OperationItem;
          children: ReactNode;
        }[];
      },
      ctx: RenderContext,
    ) => ReactNode;
    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        server: ReactNode;
        channel: ReactNode;
        authSchemes: ReactNode;
        parameters: ReactNode;
        messages: ReactNode;
        reply: ReactNode;
        bindings: ReactNode;
      },
      context: {
        operation: NoReference<OperationObject>;
        action: 'send' | 'receive';
        ctx: RenderContext;
      },
    ) => ReactNode;
    renderAPIExampleLayout?: (
      slots: {
        selector: ReactNode;
        usageTabs: ReactNode;
        responseTabs: ReactNode;
      },
      ctx: RenderContext,
    ) => ReactNode;
    renderAPIExampleUsageTabs?: (items: ExampleMessageItem[], ctx: RenderContext) => ReactNode;
  };
  schemaUI?: {
    render?: (
      options: {
        root: ParsedSchema;
        readOnly?: boolean;
        writeOnly?: boolean;
      },
      ctx: RenderContext,
    ) => ReactNode;
    showExample?: boolean;
  };
  components?: {
    Heading?: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
    CodeBlock?: FC<{ lang: string; code: string }>;
    Markdown?: FC<{ md: string }>;
  };
  storageKeyPrefix?: string;
}

export type AsyncAPIPageProps = AsyncAPIPageProps_Spec | AsyncAPIPageProps_Preloaded;

export type AsyncAPIPageProps_Spec = Omit<GeneratedPageProps, 'document'> & {
  payload: {
    bundled: AsyncAPIObject;
  };
};

export type AsyncAPIPageProps_Preloaded = GeneratedPageProps & {
  preloaded: {
    docs: Record<string, AsyncAPIObject>;
    proxyUrl?: string;
  };
};

export function createAsyncAPIPage({
  shiki = defaultShikiFactory,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  schemaUI: schemaUIOptions,
  generateTypeScriptDefinitions = (schema, ctx) => {
    if (typeof schema !== 'object') return;

    try {
      return compile(schema, {
        name: 'Message',
        readOnly: ctx.readOnly,
        writeOnly: ctx.writeOnly,
        getSchemaId: ctx.ctx.schema.getRawRef,
      });
    } catch (e) {
      console.warn('Failed to generate typescript schema:', e);
    }
  },
  ...options
}: CreateAsyncAPIPageOptions = {}): FC<AsyncAPIPageProps> {
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

  return function AsyncAPIPage(props) {
    let doc: AsyncAPIObject;
    if ('preloaded' in props) {
      doc = props.preloaded.docs[props.document];
      if (!doc)
        throw new Error(
          `[Fumadocs AsyncAPI] the document ${props.document} is not preloaded, make sure to pass the "preloaded" prop to <AsyncAPIPage />`,
        );
    } else {
      doc = props.payload.bundled;
    }

    const processed = useMemo(() => dereferenceBundledDocument(doc), [doc]);

    const ctx: RenderContext = useMemo(() => {
      function renderMarkdown(md: string) {
        return <Markdown md={md} />;
      }
      function resolver(v: ParsedSchema) {
        return {
          dereferenced: v,
          $ref: typeof v === 'object' ? processed.getRawRef(v) : undefined,
        };
      }

      return {
        schema: processed,
        shiki,
        shikiOptions,
        generateTypeScriptDefinitions,
        SchemaUI(props) {
          if (schemaUIOptions?.render) return schemaUIOptions.render(props, ctx);
          return (
            <Schema
              {...props}
              showExample={props.showExample ?? schemaUIOptions?.showExample}
              resolver={resolver}
              renderMarkdown={renderMarkdown}
            />
          );
        },
        ...options,
        _default_processMarkdown(md) {
          processor ??= createMarkdownProcessor();
          return processor.processSync(md).result as ReactNode;
        },
        storageKeyPrefix: options.storageKeyPrefix ?? 'fumadocs-asyncapi-',
      };
    }, [processed]);

    return (
      <RenderContextProvider ctx={ctx}>
        <PageContent {...props} />
      </RenderContextProvider>
    );
  };
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
