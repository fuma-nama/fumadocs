import type { DereferenceMap, Document, OperationObject } from '@/types';
import Slugger from 'github-slugger';
import Parser from '@apidevtools/json-schema-ref-parser';
import { Operation } from '@/render/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/schema/method';
import { createRenders, type Renderer } from '@/render/renderer';
import { OpenAPIV3_1 } from 'openapi-types';
import type { NoReference } from '@/utils/schema';
import { Fragment } from 'react';

export interface ApiPageProps
  extends Pick<
    RenderContext,
    'generateCodeSamples' | 'generateTypeScriptSchema' | 'shikiOptions'
  > {
  document: string | Document;
  hasHead: boolean;

  renderer?: Partial<Renderer>;

  /**
   * An array of operations
   */
  operations?: OperationItem[];

  webhooks?: WebhookItem[];

  /**
   * By default, it is disabled on dev mode
   */
  disableCache?: boolean;
}

type ProcessedDocument = {
  document: NoReference<Document>;
  dereferenceMap: DereferenceMap;
};

const cache = new Map<string, ProcessedDocument>();

export interface WebhookItem {
  name: string;
}

export interface OperationItem {
  path: string;
  method: OpenAPIV3_1.HttpMethods;
}

export async function APIPage(props: ApiPageProps) {
  const {
    operations,
    hasHead = true,
    webhooks,
    disableCache = process.env.NODE_ENV === 'development',
  } = props;
  let processed: ProcessedDocument;

  const cached =
    !disableCache && typeof props.document === 'string'
      ? cache.get(props.document)
      : null;

  if (!cached) {
    const dereferenceMap: DereferenceMap = new Map();
    const dereferenced = await Parser.dereference<NoReference<Document>>(
      props.document,
      {
        dereference: {
          onDereference($ref: string, schema: unknown) {
            dereferenceMap.set(schema, $ref);
          },
        },
      },
    );

    processed = {
      document: dereferenced,
      dereferenceMap,
    };

    if (!disableCache && typeof props.document === 'string')
      cache.set(props.document, processed);
  } else {
    processed = cached;
  }

  const ctx = await getContext(processed, props);
  const { document } = processed;
  return (
    <ctx.renderer.Root baseUrl={ctx.baseUrl}>
      {operations?.map((item) => {
        const pathItem = document.paths?.[item.path];
        if (!pathItem) return null;

        const operation = pathItem[item.method];
        if (!operation) return null;

        const method = createMethod(item.method, pathItem, operation);

        return (
          <Operation
            key={`${item.path}:${item.method}`}
            method={method}
            path={item.path}
            ctx={ctx}
            baseUrls={document.servers?.map((s) => s.url) ?? []}
            hasHead={hasHead}
          />
        );
      })}
      {webhooks?.map((item) => {
        const webhook = document.webhooks?.[item.name];
        if (!webhook) return;

        const children = Object.entries(webhook).map(
          ([methodName, operation]) => {
            const method = createMethod(
              methodName,
              webhook,
              operation as NoReference<OperationObject>,
            );

            return (
              <Operation
                type="webhook"
                key={methodName}
                method={method}
                ctx={ctx}
                path={item.name}
                baseUrls={document.servers?.map((s) => s.url) ?? []}
                hasHead={hasHead}
              />
            );
          },
        );

        return <Fragment key={item.name}>{children}</Fragment>;
      })}
    </ctx.renderer.Root>
  );
}

async function getContext(
  { document, dereferenceMap }: ProcessedDocument,
  options: ApiPageProps,
): Promise<RenderContext> {
  return {
    document: document,
    dereferenceMap,
    renderer: {
      ...createRenders(options.shikiOptions),
      ...options.renderer,
    },
    shikiOptions: options.shikiOptions,
    generateTypeScriptSchema: options.generateTypeScriptSchema,
    generateCodeSamples: options.generateCodeSamples,
    baseUrl: document.servers?.[0].url ?? 'https://example.com',
    slugger: new Slugger(),
  };
}
