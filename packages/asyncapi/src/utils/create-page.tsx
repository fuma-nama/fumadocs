'use client';
import type { PageOperationProps } from '@/operation';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import {
  createPageComponents,
  defaultShikiOptions,
  type PageComponents,
  type ShikiOptions,
} from 'shared-api/components/defaults';
import type { GeneratedPageProps, OperationItem } from '@/utils/pages/builder';
import { createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import type { AsyncAPIObject, OperationObject, ServerObject } from '@/types';
import type { DereferencedDocument } from '@/utils/document/dereference';
import { dereferenceBundledDocument } from '@/utils/document/dereference';
import type { ExampleMessageItem } from '@/utils/get-example-messages';
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
  /** the Shiki highlighter of code blocks */
  shiki?: ShikiFactory;
  shikiOptions?: ShikiOptions;
  content?: {
    renderPageLayout?: (slots: PageLayoutProps, ctx: RenderContext) => ReactNode;
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
        operation: OperationObject;
        action: 'send' | 'receive';
        ctx: RenderContext;
      },
    ) => ReactNode;
    renderAPIExampleUsageTabs?: (items: ExampleMessageItem[], ctx: RenderContext) => ReactNode;
  };
  schemaUI?: {
    /**
     * wrap the Schema UI, `ctx.SchemaUI` renders the default one.
     */
    render?: (options: SchemaUIOptions, ctx: RenderContext) => ReactNode;
    showExample?: boolean;
  };
}

/**
 * The render options of the page with their defaults applied, read from `useRenderContext()`.
 */
export interface RenderContext extends AsyncAPIRenderOptions {
  shiki: ShikiFactory;
  shikiOptions: ShikiOptions;
  /** the Schema UI of the page */
  SchemaUI: FC<SchemaUIOptions>;
}

export interface AsyncAPIProviderProps extends AsyncAPIRuntimeOptions, AsyncAPIRenderOptions {
  shiki: ShikiFactory;
  /** the bundled AsyncAPI document */
  document: AsyncAPIObject;
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
  document,
  storageKeyPrefix = 'fumadocs-asyncapi-',
  shiki,
  shikiOptions = defaultShikiOptions,
  content,
  schemaUI,
  components,
  children,
}: AsyncAPIProviderProps) {
  const runtime = useMemo<AsyncAPIRuntime>(
    () => ({ doc: dereferenceBundledDocument(document), storageKeyPrefix }),
    [document, storageKeyPrefix],
  );

  const servers = useMemo(() => {
    const { dereferenced, resolve } = runtime.doc;
    const out: Record<string, ServerObject> = {};
    for (const [k, v] of Object.entries(dereferenced.servers ?? {})) out[k] = resolve(v);

    return out;
  }, [runtime]);

  const { SchemaUI } = components;
  const render = useMemo<RenderContext>(
    () => ({ shiki, shikiOptions, content, schemaUI, SchemaUI }),
    [shiki, shikiOptions, content, schemaUI, SchemaUI],
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
 * Code blocks are highlighted with the full Shiki bundle, pass `shiki` to trim it.
 */
export function createAsyncAPIRenderer({
  components,
  shiki = defaultShikiFactory,
  ...options
}: CreateAsyncAPIRendererOptions): FC<AsyncAPIPageProps> {
  const { Operation, Layout = DefaultLayout } = components;
  const slots: AsyncAPIComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ ...options, shiki, components }),
  };

  function Content({ showTitle, showDescription, operations }: AsyncAPIPageProps) {
    const ctx = useRenderContext();
    const layout: PageLayoutProps = {
      operations: operations?.map((item) => ({
        item,
        children: (
          <Operation
            key={`${item.id}:${item.action}`}
            id={item.id}
            action={item.action}
            showTitle={showTitle}
            showDescription={showDescription}
          />
        ),
      })),
    };

    if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(layout, ctx);
    return <Layout {...layout} />;
  }

  return function AsyncAPIPage(props) {
    let document: AsyncAPIObject;
    if ('preloaded' in props) {
      document = props.preloaded.docs[props.document];
      if (!document)
        throw new Error(
          `[Fumadocs AsyncAPI] the document ${props.document} is not preloaded, make sure to pass the "preloaded" prop to <AsyncAPIPage />`,
        );
    } else {
      document = props.payload.bundled;
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
