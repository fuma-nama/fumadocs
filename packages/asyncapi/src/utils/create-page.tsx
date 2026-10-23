'use client';
import type { PageOperationProps } from '@/operation';
import type { PlaygroundTransport } from '@/playground';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import type { Highlighter } from 'fumadocs-core/highlight';
import {
  createPageComponents,
  defaultShikiOptions,
  type PageComponents,
  resolveHighlighter,
  type ShikiOptions,
} from 'shared-api/components/defaults';
import type { GeneratedPageProps, OperationItem } from '@/utils/pages/builder';
import { createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import { createDocumentCache } from 'shared-api/utils/document-cache';
import type { AsyncAPIObject, OperationObject } from '@/types';
import {
  type DereferencedDocument,
  dereferenceBundledDocument,
} from '@/utils/document/dereference';
import type { CodeUsageGeneratorRegistry } from '@/codegen';
import type { JsonSchema } from '@fumadocs/json-schema';
import Slugger from 'github-slugger';
import { getOperation, getOperationDisplayName, getServers } from './schema';
import {
  generateTypeScriptDefinitions as defaultTypeScriptDefinitions,
  type GenerateTypeScriptDefinitionsContext,
} from './typescript';
import { ServerProvider } from './use-server';

/** components the UI renders through, so a page can replace them */
export interface AsyncAPIComponents extends PageComponents {
  SchemaUI: FC<SchemaUIOptions>;
}

export interface AsyncAPIRuntimeOptions {
  /**
   * Prefix of `localStorage` keys.
   *
   * Useful when using multiple AsyncAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-asyncapi-`
   */
  storageKeyPrefix?: string;
}

/**
 * The document and options of the page, read from `useAsyncAPI()`.
 */
export interface AsyncAPIRuntime extends AsyncAPIRuntimeOptions {
  doc: DereferencedDocument;
  storageKeyPrefix: string;
}

export interface PageLayoutProps {
  operations?: { item: OperationItem; children: ReactNode }[];
}

/**
 * The options the UI renders with, read from `useRenderContext()`.
 */
export interface AsyncAPIRenderOptions {
  /** the highlighter of code blocks, defaults to Shiki */
  highlighter?: Highlighter;
  /** @deprecated use `highlighter`, like `createShikiHighlighter()` */
  shiki?: ShikiFactory;
  /** @deprecated use `highlighter`, like `createShikiHighlighter()` */
  shikiOptions?: ShikiOptions;
  content?: {
    renderPageLayout?: (slots: PageLayoutProps, ctx: RenderContext) => ReactNode;
    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        /** the server, channel address and direction of messages, with the playground */
        connection: ReactNode;
        description: ReactNode;
        /** code samples for the selected server */
        usage: ReactNode;
        authSchemes: ReactNode;
        parameters: ReactNode;
        /** the messages with their payload, headers and examples */
        messages: ReactNode;
        reply: ReactNode;
        /** protocol details from the bindings of the selected server */
        bindings: ReactNode;
      },
      context: {
        operation: OperationObject;
        action: 'send' | 'receive';
        ctx: RenderContext;
      },
    ) => ReactNode;
  };
  playground?: {
    /**
     * Try channels in a playground, from the connection bar of operations.
     *
     * @defaultValue true
     */
    enabled?: boolean;
    /** connect to servers by protocol, on top of the built-in `ws` and `wss` */
    transports?: Record<string, PlaygroundTransport>;
  };
  schemaUI?: {
    /**
     * wrap the Schema UI, `ctx.SchemaUI` renders the default one.
     */
    render?: (options: SchemaUIOptions, ctx: RenderContext) => ReactNode;
    showExample?: boolean;
  };
  /** generators of code samples for all operations, defaults to JavaScript and Python */
  codeUsages?: CodeUsageGeneratorRegistry;
  /**
   * Generate TypeScript definitions of message payloads and headers, readers can copy them.
   *
   * Pass `false` to disable it.
   */
  generateTypeScriptDefinitions?:
    | ((schema: JsonSchema, ctx: GenerateTypeScriptDefinitionsContext) => string | undefined)
    | false;
}

/**
 * The render options of the page with their defaults applied, read from `useRenderContext()`.
 */
export interface RenderContext extends AsyncAPIRenderOptions {
  /** @deprecated use `highlighter` */
  shiki: ShikiFactory;
  /** @deprecated use `highlighter` */
  shikiOptions: ShikiOptions;
  highlighter: Highlighter;
  /** the Schema UI of the page */
  SchemaUI: FC<SchemaUIOptions>;
}

export interface AsyncAPIProviderProps extends AsyncAPIRuntimeOptions, AsyncAPIRenderOptions {
  /** the bundled AsyncAPI document */
  document: AsyncAPIObject | Promise<AsyncAPIObject>;
  components: AsyncAPIComponents;
  children: ReactNode;
}

export interface CreateAsyncAPIRendererOptions
  extends AsyncAPIRuntimeOptions, AsyncAPIRenderOptions {
  components: Partial<PageComponents> & {
    SchemaUI: FC<SchemaUIOptions>;
    /** renders an operation of the page */
    Operation: FC<PageOperationProps>;
    /** wraps the rendered operations */
    Layout?: FC<PageLayoutProps>;
  };
  /** load documents left out of page props (`includeDocument: false`) by ID, in server rendering too */
  loadDocument?: (id: string) => Promise<AsyncAPIObject>;
}

export type AsyncAPIPageProps = AsyncAPIPageProps_Spec | AsyncAPIPageProps_Preloaded;

export type AsyncAPIPageProps_Spec = Omit<GeneratedPageProps, 'document'> & {
  document?: string;
  payload: {
    bundled?: AsyncAPIObject;
  };
};

export type AsyncAPIPageProps_Preloaded = GeneratedPageProps & {
  preloaded: {
    docs: Record<string, AsyncAPIObject>;
  };
};

const AsyncAPIContext = createContext<AsyncAPIRuntime | null>(null);
const ComponentsContext = createContext<AsyncAPIComponents | null>(null);
const OptionsContext = createContext<RenderContext | null>(null);

/**
 * The runtime of the API page: the document and its options.
 */
export function useAsyncAPI(): AsyncAPIRuntime {
  const ctx = use(AsyncAPIContext);
  if (!ctx) throw new Error('Component must be used under <AsyncAPIProvider />');

  return ctx;
}

export function useComponents(): AsyncAPIComponents {
  const components = use(ComponentsContext);
  if (!components) throw new Error('Component must be used under <AsyncAPIProvider />');

  return components;
}

/**
 * The render options of the page, available under a page created with `createAsyncAPIRenderer()`.
 */
export function useRenderContext(): RenderContext {
  const ctx = use(OptionsContext);
  if (!ctx) throw new Error('Component must be used under <AsyncAPIProvider />');

  return ctx;
}

/**
 * The runtime of an API page, for UIs built from the headless hooks.
 */
export function AsyncAPIProvider({
  document: input,
  storageKeyPrefix = 'fumadocs-asyncapi-',
  shiki = defaultShikiFactory,
  shikiOptions = defaultShikiOptions,
  highlighter,
  content,
  playground,
  schemaUI,
  codeUsages,
  generateTypeScriptDefinitions,
  components,
  children,
}: AsyncAPIProviderProps) {
  const document = input instanceof Promise ? use(input) : input;
  const runtime = useMemo<AsyncAPIRuntime>(
    () => ({ doc: dereferenceBundledDocument(document), storageKeyPrefix }),
    [document, storageKeyPrefix],
  );

  const servers = useMemo(() => getServers(runtime.doc.dereferenced), [runtime.doc]);

  const { SchemaUI } = components;
  const render = useMemo<RenderContext>(
    () => ({
      shiki,
      shikiOptions,
      highlighter: resolveHighlighter({ highlighter, shiki, shikiOptions }),
      content,
      playground,
      schemaUI,
      codeUsages,
      generateTypeScriptDefinitions,
      SchemaUI,
    }),
    [
      shiki,
      shikiOptions,
      highlighter,
      content,
      playground,
      schemaUI,
      codeUsages,
      generateTypeScriptDefinitions,
      SchemaUI,
    ],
  );

  return (
    <AsyncAPIContext value={runtime}>
      <ComponentsContext value={components}>
        <OptionsContext value={render}>
          <ServerProvider servers={servers} storageKeyPrefix={storageKeyPrefix}>
            {children}
          </ServerProvider>
        </OptionsContext>
      </ComponentsContext>
    </AsyncAPIContext>
  );
}

/**
 * Create `<AsyncAPIPage />` from your own UI, it takes the props of generated pages.
 *
 * Code blocks are highlighted with the full Shiki bundle unless you pass a `highlighter`.
 */
export function createAsyncAPIRenderer({
  components,
  shiki = defaultShikiFactory,
  generateTypeScriptDefinitions = defaultTypeScriptDefinitions,
  loadDocument,
  ...rest
}: CreateAsyncAPIRendererOptions): FC<AsyncAPIPageProps> {
  const highlighter = resolveHighlighter({ ...rest, shiki });
  const options = { ...rest, generateTypeScriptDefinitions, highlighter };
  const { Operation, Layout = DefaultLayout } = components;
  const load = createDocumentCache<AsyncAPIObject>();
  const slots: AsyncAPIComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ highlighter, components }),
  };

  function Content({ showTitle, showDescription, operations }: AsyncAPIPageProps) {
    const ctx = useRenderContext();
    const { doc } = useAsyncAPI();
    // operations can share titles, their anchors are unique like the headings of static data
    const slugger = new Slugger();
    const layout: PageLayoutProps = {
      operations: operations?.map((item) => {
        let anchor: string | undefined;
        if (showTitle) {
          const operation = getOperation(doc.dereferenced, item.id);
          anchor = slugger.slug(operation ? getOperationDisplayName(item.id, operation) : item.id);
        }

        return {
          item,
          children: (
            <Operation
              key={item.id}
              id={item.id}
              anchor={anchor}
              showTitle={showTitle}
              showDescription={showDescription}
            />
          ),
        };
      }),
    };

    if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(layout, ctx);
    return <Layout {...layout} />;
  }

  return function AsyncAPIPage(props) {
    let document: AsyncAPIObject | Promise<AsyncAPIObject> | undefined =
      'preloaded' in props ? props.preloaded.docs[props.document] : props.payload.bundled;
    if (!document) {
      if (!props.document || !loadDocument)
        throw new Error(
          `[Fumadocs AsyncAPI] the document "${props.document}" is not in the page props, pass \`loadDocument\` to \`createAsyncAPIPage()\``,
        );
      // loaded outside of the provider, which suspends on it
      document = load(props.document, loadDocument);
    }

    return (
      <AsyncAPIProvider {...options} shiki={shiki} document={document} components={slots}>
        <Content {...props} />
      </AsyncAPIProvider>
    );
  };
}

function DefaultLayout({ operations }: PageLayoutProps) {
  return <>{operations?.map((item) => item.children)}</>;
}
