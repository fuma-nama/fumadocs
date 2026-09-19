'use client';
import type { PageOperationProps } from '@/operation';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import {
  createPageComponents,
  type CreatePageComponentsOptions as PageComponentsOptions,
} from 'shared-api/components/defaults';
import type { GeneratedPageProps, OperationItem } from '@/utils/pages/builder';
import { type ComponentProps, createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type { SchemaUIOptions } from 'shared-api/components/schema';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { AsyncAPIObject, ServerObject } from '@/types';
import type { DereferencedDocument } from '@/utils/document/dereference';
import { dereferenceBundledDocument } from '@/utils/document/dereference';

import { ServerProvider } from './use-server';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/** components the UI renders through, so a page can replace them */
export interface AsyncAPIComponents {
  SchemaUI: FC<Omit<SchemaUIOptions, 'resolver'>>;
  Markdown: FC<{ md: string }>;
  CodeBlock: FC<CodeBlockProps>;
  Heading: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
}

export interface AsyncAPIRuntime {
  doc: DereferencedDocument;
  /**
   * Prefix of `localStorage` keys.
   *
   * Useful when using multiple AsyncAPI instances to prevent state conflicts.
   *
   * @defaultValue `fumadocs-asyncapi-`
   */
  storageKeyPrefix: string;
}

export interface AsyncAPIProviderProps extends Partial<Omit<AsyncAPIRuntime, 'doc'>> {
  /** the bundled AsyncAPI document */
  document: AsyncAPIObject;
  components: AsyncAPIComponents;
  children: ReactNode;
}

const AsyncAPIContext = createContext<AsyncAPIRuntime | null>(null);
const ComponentsContext = createContext<AsyncAPIComponents | null>(null);

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
 * The runtime of an API page, for UIs built from the headless hooks.
 */
export function AsyncAPIProvider({
  document,
  storageKeyPrefix = 'fumadocs-asyncapi-',
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

  return (
    <AsyncAPIContext value={runtime}>
      <ComponentsContext value={components}>
        <ServerProvider servers={servers} storageKeyPrefix={storageKeyPrefix}>
          {children}
        </ServerProvider>
      </ComponentsContext>
    </AsyncAPIContext>
  );
}

export interface PageLayoutProps {
  operations?: { item: OperationItem; children: ReactNode }[];
}

export interface CreateAsyncAPIPageOptions extends Omit<
  AsyncAPIProviderProps,
  'document' | 'components' | 'children'
> {
  /** the Shiki highlighter of code blocks, the full bundle by default */
  shiki?: ShikiFactory;
  shikiOptions?: PageComponentsOptions['shikiOptions'];
  components: Pick<AsyncAPIComponents, 'SchemaUI'> &
    Partial<Omit<AsyncAPIComponents, 'SchemaUI'>> & {
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

/**
 * Create `<AsyncAPIPage />` from your own UI, it takes the props of generated pages.
 */
export function createAsyncAPIPage({
  components,
  shiki = defaultShikiFactory,
  shikiOptions,
  ...options
}: CreateAsyncAPIPageOptions): FC<AsyncAPIPageProps> {
  const { Operation, Layout = DefaultLayout } = components;
  const slots: AsyncAPIComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ shiki, shikiOptions, components }).components,
  };

  function Content({ showTitle, showDescription, operations }: AsyncAPIPageProps) {
    return (
      <Layout
        operations={operations?.map((item) => ({
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
        }))}
      />
    );
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
      <AsyncAPIProvider {...options} document={document} components={slots}>
        <Content {...props} />
      </AsyncAPIProvider>
    );
  };
}

function DefaultLayout({ operations }: PageLayoutProps) {
  return <>{operations?.map((item) => item.children)}</>;
}
