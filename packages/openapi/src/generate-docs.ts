import { writeFileSync } from 'node:fs';
import Parser from '@readme/openapi-parser';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { p } from './render/element';
import { getPreferredMedia, noRef } from './utils';
import { schemaElement } from './render/schema';
import { getSampleRequest } from './samples/curl';
import type { RouteInformation, MethodInformation } from './types';
import type { Endpoint } from './samples';
import { createEndpoint } from './samples';
import { getExampleResponse } from './samples/response';
import { api, apiExample, apiInfo, root, tab, tabs } from './render/custom';

export async function generate(path: string): Promise<void> {
  const document = (await Parser.dereference(path)) as OpenAPI.Document;

  const routes = Object.entries(document.paths).map<RouteInformation>(
    ([key, value]) => {
      if (!value) throw new Error('Invalid schema');
      const methodKeys = ['get', 'post', 'patch', 'delete', 'head'] as const;
      const methods: MethodInformation[] = [];

      for (const methodKey of methodKeys) {
        if (methodKey in value) {
          const operation = value[methodKey];
          if (operation) methods.push(buildOperation(methodKey, operation));
        }
      }

      return {
        ...value,
        path: key,
        methods,
      };
    },
  );

  const serverUrl = document.servers?.[0].url;
  const s: string[] = [];

  routes.forEach((entry) => {
    for (const method of entry.methods) {
      s.push(getOperationContent(entry.path, method, serverUrl));
    }
  });

  writeFileSync('./output.mdx', root(...s));
}

function getOperationContent(
  path: string,
  method: MethodInformation,
  baseUrl?: string,
): string {
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
    [`\`\`\`bash title="curl"`, getSampleRequest(endpoint), '```'].join('\n'),
  );

  example.push(getResponseTabs(endpoint, method));

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

function getResponseTabs(
  endpoint: Endpoint,
  operation: OpenAPI.OperationObject,
): string {
  const items: string[] = [];
  const child: string[] = [];

  Object.entries(operation.responses).forEach(([code, _]) => {
    const example = getExampleResponse(endpoint, code);

    if (example) {
      items.push(code);

      child.push(
        tab(
          { value: code },
          [`\`\`\`json title="Example Response"`, example, '```'].join('\n'),
        ),
      );
    }
  });

  if (items.length === 0) return '';

  return tabs(
    {
      items,
    },
    ...child,
  );
}

function buildOperation(
  method: string,
  operation: OpenAPI.OperationObject,
): MethodInformation {
  return {
    ...operation,
    parameters: (operation.parameters ?? []) as OpenAPI.ParameterObject[],
    method: method.toUpperCase(),
  };
}
