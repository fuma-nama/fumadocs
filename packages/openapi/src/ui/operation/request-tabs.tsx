import type { MethodInformation, RenderContext } from '@/types';
import { getPreferredType, type NoReference, pickExample } from '@/utils/schema';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';
import { sample } from 'openapi-sampler';
import type { ReactNode } from 'react';
import type { RawRequestData, RequestData } from '@/requests/types';
import { encodeRequestData } from '@/requests/media/encode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import { resolveRequestData } from '@/utils/url';
import { MethodLabel } from '../components/method-label';

export interface ExampleRequestItem {
  id: string;
  name: string;
  description?: string;
  data: RawRequestData;
  encoded: RequestData;
}

export function getExampleRequests(
  path: string,
  operation: NoReference<MethodInformation>,
  ctx: RenderContext,
): ExampleRequestItem[] {
  const media = operation.requestBody ? getPreferredType(operation.requestBody.content) : null;
  const bodyOfType = media ? operation.requestBody?.content[media] : null;

  if (bodyOfType?.examples) {
    const result: ExampleRequestItem[] = [];

    for (const [key, value] of Object.entries(bodyOfType.examples)) {
      const data = getRequestData(path, operation, key, ctx);

      result.push({
        id: key,
        name: value.summary || key,
        description: value.description,
        data,
        encoded: encodeRequestData(data, ctx.mediaAdapters, operation.parameters ?? []),
      });
    }

    if (result.length > 0) return result;
  }

  const data = getRequestData(path, operation, null, ctx);
  return [
    {
      id: '_default',
      name: 'Default',
      description: bodyOfType?.schema?.description,
      data,
      encoded: encodeRequestData(data, ctx.mediaAdapters, operation.parameters ?? []),
    },
  ];
}

function getRequestData(
  path: string,
  method: NoReference<MethodInformation>,
  sampleKey: string | null,
  _ctx: RenderContext,
): RawRequestData {
  const result: RawRequestData = {
    path: {},
    cookie: {},
    header: {},
    query: {},
    method: method.method,
  };

  for (const param of method.parameters ?? []) {
    let value = pickExample(param);

    if (value === undefined && param.required) {
      if (param.schema) {
        value = sample(param.schema as object);
      } else if (param.content) {
        const type = getPreferredType(param.content);
        const content = type ? param.content[type] : undefined;
        if (!content || !content.schema)
          throw new Error(
            `Cannot find "${param.name}" parameter info for media type "${type}" in ${path} ${method.method}`,
          );

        value = sample(content.schema as object);
      }
    }

    switch (param.in) {
      case 'cookie':
        result.cookie[param.name] = value;
        break;
      case 'header':
        result.header[param.name] = value;
        break;
      case 'query':
        result.query[param.name] = value;
        break;
      default:
        result.path[param.name] = value;
    }
  }

  if (method.requestBody) {
    const body = method.requestBody.content;
    const type = getPreferredType(body);
    if (!type)
      throw new Error(`Cannot find body schema for ${path} ${method.method}: missing media type`);
    result.bodyMediaType = type as RawRequestData['bodyMediaType'];
    const bodyOfType = body[type];

    if (bodyOfType.examples && sampleKey) {
      result.body = bodyOfType.examples[sampleKey].value;
    } else if (bodyOfType.example) {
      result.body = bodyOfType.example;
    } else {
      result.body = sample((bodyOfType?.schema ?? {}) as object, {
        skipReadOnly: method.method !== 'GET',
        skipWriteOnly: method.method === 'GET',
        skipNonRequired: true,
      });
    }
  }

  return result;
}

export async function RequestTabs({
  path,
  operation,
  ctx,
}: {
  path: string;
  operation: NoReference<MethodInformation>;
  ctx: RenderContext;
}) {
  if (!operation.requestBody) return null;
  const { renderRequestTabs = renderRequestTabsDefault } = ctx.content ?? {};

  return renderRequestTabs(getExampleRequests(path, operation, ctx), {
    ...ctx,
    route: path,
    operation,
  });
}

function renderRequestTabsDefault(
  items: ExampleRequestItem[],
  ctx: RenderContext & {
    route: string;
    operation: NoReference<MethodInformation>;
  },
) {
  function renderItem(item: ExampleRequestItem) {
    const requestData = item.data;
    const displayNames: Partial<Record<keyof RawRequestData, ReactNode>> = {
      body: (
        <>
          Body
          <code className="text-xs text-fd-muted-foreground ms-auto">
            {requestData.bodyMediaType}
          </code>
        </>
      ),
      cookie: 'Cookie',
      header: 'Header',
      query: 'Query Parameters',
      path: 'Path Parameters',
    };

    return (
      <>
        {item.description && ctx.renderMarkdown(item.description)}
        <div className="flex flex-row gap-2 items-center justify-between">
          <MethodLabel>{requestData.method}</MethodLabel>
          <code>{resolveRequestData(ctx.route, item.encoded)}</code>
        </div>

        <Accordions type="multiple" className="mt-2">
          {Object.entries(displayNames).map(([k, v]) => {
            const data = requestData[k as keyof RawRequestData];
            if (!data || Object.keys(data).length === 0) return;

            return (
              <AccordionItem key={k} value={k}>
                <AccordionHeader>
                  <AccordionTrigger>{v}</AccordionTrigger>
                </AccordionHeader>
                <AccordionContent className="prose-no-margin">
                  {ctx.renderCodeBlock('json', JSON.stringify(data, null, 2))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordions>
      </>
    );
  }

  let children: ReactNode;
  if (items.length > 1) {
    children = (
      <Tabs defaultValue={items[0].id}>
        <TabsList>
          {items.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {items.map((item) => (
          <TabsContent key={item.id} value={item.id}>
            {renderItem(item)}
          </TabsContent>
        ))}
      </Tabs>
    );
  } else if (items.length === 1) {
    children = renderItem(items[0]);
  } else {
    children = <p className="text-fd-muted-foreground text-xs">Empty</p>;
  }

  return (
    <div className="p-3 rounded-xl border prose-no-margin bg-fd-card text-fd-card-foreground shadow-md">
      <p className="font-semibold border-b pb-2">Example Requests</p>
      {children}
    </div>
  );
}
