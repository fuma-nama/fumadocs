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
import { Heading } from 'fumadocs-ui/components/heading';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { APIPage, type ApiPageProps } from './api-page';
import type { APIPlaygroundProps, CreateAPIPageOptions } from './base';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { compile } from '@fumari/json-schema-ts';
import { ClientCodeBlock, ClientCodeBlockProvider } from './components/codeblock';
import { slug } from 'github-slugger';
import * as ClientBoundary from '@/ui/client/boundary';
import { dereferenceDocument } from '@/utils/document/dereference';
import { parseSecurities } from '@/utils/schema';
import { AuthProvider } from '@/playground/auth';

export interface ClientApiPageProps extends Omit<ApiPageProps, 'document'> {
  payload: ClientApiPagePayload;
}

export interface ClientApiPagePayload {
  bundled: Document;
  proxyUrl?: string;
}

export type CreateClientAPIPageOptions = Omit<
  Partial<CreateAPIPageOptions>,
  'generateTypeScriptSchema'
>;

/**
 * Create `<APIPage />` for non-RSC environment, note that this may be unstable, and doesn't support the full set of features.
 */
export function createClientAPIPage({
  shiki = defaultShikiFactory,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  generateTypeScriptDefinitions = (schema, ctx) => {
    if (typeof schema !== 'object') return;

    try {
      return compile(schema, {
        name: 'Response',
        readOnly: ctx.readOnly,
        writeOnly: ctx.writeOnly,
        getSchemaId: ctx.schema.getRawRef,
      });
    } catch (e) {
      console.warn('Failed to generate typescript schema:', e);
    }
  },
  ...options
}: CreateClientAPIPageOptions = {}): FC<ClientApiPageProps> {
  let processor: ReturnType<typeof createMarkdownProcessor>;
  const mdxComponents = {
    ...defaultMdxComponents,
    img: undefined,
    pre: MarkdownPre,
  };

  function createMarkdownProcessor() {
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

  function renderPlaygroundDefault({ method, path, ctx }: APIPlaygroundProps) {
    return (
      <ctx.clientBoundary.PlaygroundClient
        route={path}
        securities={parseSecurities(method, ctx.schema.dereferenced)}
        method={method.method}
        doc={ctx.schema.bundled}
        proxyUrl={ctx.proxyUrl}
        writeOnly
        readOnly={false}
      />
    );
  }

  function renderPlaygroundProviderDefault({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return function ClientAPIPage({ payload, ...props }) {
    const processed = useMemo(() => dereferenceDocument(payload.bundled), [payload.bundled]);

    const ctx: RenderContext = useMemo(
      () => ({
        schema: processed,
        proxyUrl: payload.proxyUrl,
        shiki,
        shikiOptions,
        generateTypeScriptDefinitions,
        clientBoundary: ClientBoundary,
        ...options,
        mediaAdapters: {
          ...defaultAdapters,
          ...options.mediaAdapters,
        },
        playground: {
          ...options.playground,
          provider: options.playground?.provider ?? renderPlaygroundProviderDefault,
          render: options.playground?.render ?? renderPlaygroundDefault,
        },
        renderHeading(depth, text, props) {
          const id = typeof text === 'string' ? slug(text) : props?.id;
          if (!id) throw new Error("missing 'id' for non-string children");

          if (options.renderHeading) {
            return options.renderHeading({ id, children: text, ...props }, depth);
          }

          return (
            <Heading id={id} key={id} as={`h${depth}` as `h1`} {...props}>
              {text}
            </Heading>
          );
        },
        renderMarkdown(text) {
          if (options.renderMarkdown) return options.renderMarkdown(text);
          processor ??= createMarkdownProcessor();

          return processor.processSync({
            value: text,
          }).result as ReactNode;
        },
        renderCodeBlock(lang, code) {
          if (options.renderCodeBlock) {
            return options.renderCodeBlock({ lang, code });
          }

          return <ClientCodeBlock lang={lang} code={code} />;
        },
      }),
      [payload.proxyUrl, processed],
    );

    return (
      <ClientCodeBlockProvider factory={shiki}>
        <APIPage {...props} ctx={ctx} />
      </ClientCodeBlockProvider>
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
