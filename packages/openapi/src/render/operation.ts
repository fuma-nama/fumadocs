import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { createEndpoint, type Endpoint } from '@/samples';
import { getExampleResponse } from '@/samples/response';
import { getTypescript } from '@/samples/typescript';
import { getSampleRequest } from '@/samples/curl';
import type { MethodInformation } from '@/types';
import { noRef, getPreferredMedia } from '@/utils';
import { codeblock, p } from './element';
import {
  accordion,
  accordions,
  api,
  apiExample,
  apiInfo,
  tab,
  tabs,
} from './custom';
import { schemaElement } from './schema';

export async function renderOperation(
  path: string,
  method: MethodInformation,
  baseUrl?: string,
): Promise<string> {
  const info: string[] = [];
  const example: string[] = [];
  info.push(`## ${method.summary ?? method.operationId}`);
  if (method.description) info.push(p(method.description));

  const body = noRef(method.requestBody);

  if (body) {
    const bodySchema = getPreferredMedia(body.content)?.schema;
    if (!bodySchema) throw new Error();

    info.push(
      `### Request Body${!body.required ? ' (Optional)' : ''}`,
      p(body.description),
      schemaElement('body', noRef(bodySchema), {
        parseObject: true,
        readOnly: method.method === 'GET',
        writeOnly: method.method !== 'GET',
        required: body.required ?? false,
      }),
    );
  }

  const parameterGroups = new Map<string, string[]>();
  const endpoint = createEndpoint(path, method, baseUrl);

  for (const param of method.parameters) {
    const schema = noRef(
      param.schema ?? getPreferredMedia(param.content ?? {})?.schema,
    );

    if (!schema) continue;

    const content = schemaElement(
      param.name,
      {
        ...schema,
        description: param.description ?? schema.description,
        deprecated: param.deprecated || schema.deprecated,
      },
      {
        parseObject: false,
        readOnly: method.method === 'GET',
        writeOnly: method.method !== 'GET',
        required: param.required ?? false,
      },
    );

    const groupName =
      {
        path: 'Path Parameters',
        query: 'Query Parameters',
        header: 'Header Parameters',
        cookie: 'Cookie Parameters',
      }[param.in] ?? 'Other Parameters';

    const group = parameterGroups.get(groupName) ?? [];
    group.push(content);
    parameterGroups.set(groupName, group);
  }

  for (const [group, parameters] of Array.from(parameterGroups.entries())) {
    info.push(`### ${group}`, ...parameters);
  }

  info.push(getResponseTable(method));

  example.push(
    codeblock({ language: 'bash', title: 'curl' }, getSampleRequest(endpoint)),
  );

  example.push(await getResponseTabs(endpoint, method));

  return api(
    apiInfo({ method: method.method, route: path }, ...info),
    apiExample(...example),
  );
}

function getResponseTable(operation: OpenAPI.OperationObject): string {
  const table: string[] = [];
  table.push(`| Status code | Description |`);
  table.push(`| ----------- | ----------- |`);

  Object.entries(operation.responses).forEach(([code, value]) => {
    table.push(`| \`${code}\` | ${noRef(value).description} |`);
  });

  return table.join('\n');
}

async function getResponseTabs(
  endpoint: Endpoint,
  operation: OpenAPI.OperationObject,
): Promise<string> {
  const items: string[] = [];
  const child: string[] = [];

  for (const [code, _] of Object.entries(operation.responses)) {
    const example = getExampleResponse(endpoint, code);
    // eslint-disable-next-line no-await-in-loop -- Keep order
    const ts = await getTypescript(endpoint, code);
    const description =
      code in endpoint.responses
        ? endpoint.responses[code].schema.description
        : undefined;

    if (example && ts) {
      items.push(code);

      child.push(
        tab(
          { value: code },
          p(description),
          codeblock({ language: 'json', title: 'Example Response' }, example),
          accordions(
            accordion(
              { title: 'Typescript Definition' },
              codeblock({ language: 'ts' }, ts),
            ),
          ),
        ),
      );
    }
  }

  if (items.length === 0) return '';

  return tabs(
    {
      items,
    },
    ...child,
  );
}
