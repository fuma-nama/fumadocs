/* eslint-disable @typescript-eslint/no-explicit-any -- rehype-react without types */
import type { Document, RenderContext } from '@/types';
import type { NoReference } from '@/utils/schema';
import type { ProcessedDocument } from '@/utils/process-document';
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
import type { CreateAPIPageOptions } from './base';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { compile } from '@fumari/json-schema-ts';
import { ClientCodeBlock, ClientCodeBlockProvider } from './components/codeblock';
import { dereferenceSync } from '@/utils/schema/dereference';
import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import { slug } from 'github-slugger';
import * as ClientBoundary from '@/ui/client/boundary';

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

  return function ClientAPIPage({ payload, ...props }) {
    const processed = useMemo<ProcessedDocument>(() => {
      const dereferenceMap = new Map<object, string>();

      return {
        bundled: payload.bundled,
        dereferenced: dereferenceSync(payload.bundled as JSONSchema, (schema, ref) => {
          dereferenceMap.set(schema as object, ref);
        }) as NoReference<Document>,
        getRawRef(obj) {
          return dereferenceMap.get(obj);
        },
      };
    }, [payload.bundled]);

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
