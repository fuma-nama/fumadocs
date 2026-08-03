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
import type { GraphQLField, GraphQLNamedType } from 'graphql';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { BundledTheme, CodeOptionsThemes, CodeToHastOptionsCommon } from 'shiki';
import type { RenderContext } from '@/types';
import type { PlaygroundRequest, PlaygroundResult } from '@/playground/fetcher';
import type { GeneratedPageProps, GraphQLPageItem } from '@/utils/pages';
import type { NamedTypeKind, OperationKind } from '@/utils/schema';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { PageContent } from './api-page';
import { ClientCodeBlock } from './components/codeblock';
import { RenderContextProvider } from './contexts/api';
import { GraphQLSchemaView, type SchemaViewProps } from './schema-ui';

export interface CreateGraphQLPageOptions {
  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;
  /**
   * resolve the URL of the docs page of a named type, used for cross-linking type references.
   *
   * return `undefined` for types without their own page.
   */
  typeLinks?: (name: string, ctx: RenderContext) => string | undefined;
  /**
   * resolve the URL of the docs page of an operation, used for cross-linking operation references
   * (e.g. usage backlinks on type pages).
   *
   * return `undefined` for operations without their own page.
   */
  operationLinks?: (kind: OperationKind, name: string, ctx: RenderContext) => string | undefined;
  /**
   * interactive playground, shown on operation pages when `url`, `fetcher` or `render` is provided.
   */
  playground?: {
    /**
     * the URL of GraphQL endpoint, operations are sent over HTTP POST.
     */
    url?: string;
    /**
     * allow users to edit the endpoint URL, it is rendered as plain text when disabled.
     *
     * @defaultValue true
     */
    allowUrlEdit?: boolean;
    /**
     * default headers of playground requests, used as the initial header rows
     * when the user has no stored headers for the endpoint origin.
     */
    headers?: Record<string, string>;
    /**
     * replace the default fetcher, e.g. to proxy requests.
     */
    fetcher?: (request: PlaygroundRequest, ctx: RenderContext) => Promise<PlaygroundResult>;
    /**
     * replace the playground UI.
     */
    render?: (context: {
      kind: OperationKind;
      name: string;
      operation: GraphQLField<unknown, unknown>;
      ctx: RenderContext;
    }) => ReactNode;
  };
  content?: {
    renderPageLayout?: (
      slots: {
        items?: {
          item: GraphQLPageItem;
          children: ReactNode;
        }[];
      },
      ctx: RenderContext,
    ) => ReactNode;
    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        deprecated: ReactNode;
        directives: ReactNode;
        playground: ReactNode;
        arguments: ReactNode;
        returns: ReactNode;
        example: ReactNode;
      },
      context: {
        operation: GraphQLField<unknown, unknown>;
        kind: OperationKind;
        ctx: RenderContext;
      },
    ) => ReactNode;
    renderTypeLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        directives: ReactNode;
        relations: ReactNode;
        fields: ReactNode;
        values: ReactNode;
        scalar: ReactNode;
      },
      context: {
        type: GraphQLNamedType;
        kind: NamedTypeKind;
        ctx: RenderContext;
      },
    ) => ReactNode;
  };
  schemaUI?: {
    render?: (options: SchemaViewProps, ctx: RenderContext) => ReactNode;
  };
  components?: {
    Heading?: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
    CodeBlock?: FC<{ lang: string; code: string }>;
    Markdown?: FC<{ md: string }>;
  };
}

/**
 * pre-generated links of generated pages, see `baseUrl` in source options.
 */
export interface GraphQLLinks {
  /**
   * type name -> page URL
   */
  types: Record<string, string>;
  /**
   * `${kind}:${name}` of operation -> page URL
   */
  operations: Record<string, string>;
}

export type GraphQLPageProps = GeneratedPageProps & {
  payload: {
    links?: GraphQLLinks;
    sdl: string;
  };
};

export function createGraphQLPage({
  shiki = defaultShikiFactory,
  shikiOptions = { themes: { light: 'github-light', dark: 'github-dark' } },
  schemaUI: schemaUIOptions,
  ...options
}: CreateGraphQLPageOptions = {}): FC<GraphQLPageProps> {
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

  return function GraphQLPage(props) {
    const schema = useMemo(() => buildSchemaFromSDL(props.payload.sdl), [props.payload.sdl]);

    const ctx: RenderContext = useMemo(() => {
      const ctx: RenderContext = {
        schema: {
          schema,
          sdl: props.payload.sdl,
          links: props.payload.links,
        },
        shiki,
        shikiOptions,
        SchemaUI(props) {
          if (schemaUIOptions?.render) return schemaUIOptions.render(props, ctx);
          return <GraphQLSchemaView {...props} />;
        },
        ...options,
        _default_processMarkdown(md) {
          processor ??= createMarkdownProcessor();
          return processor.processSync(md).result as ReactNode;
        },
      };

      return ctx;
    }, [schema, props.payload.sdl, props.payload.links]);

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
