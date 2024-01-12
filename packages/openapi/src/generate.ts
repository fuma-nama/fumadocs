import Parser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { RouteInformation, MethodInformation } from './types';
import { root } from './render/custom';
import { renderOperation } from './render/operation';

export async function dereference(
  pathOrDocument: string | OpenAPI.Document,
): Promise<OpenAPI.Document> {
  return (await Parser.dereference(pathOrDocument)) as OpenAPI.Document;
}

export interface GenerateOptions {
  tag?: string;
  render?: (
    title: string | undefined,
    description: string | undefined,
    content: string,
  ) => Partial<RenderResult>;
}

interface RenderResult {
  frontmatter: string;
  imports: string[];
  content: string;
}

export async function generate(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<string> {
  const document = await dereference(pathOrDocument);
  const tag = options.tag
    ? document.tags?.find((item) => item.name === options.tag)
    : undefined;

  const routes = Object.entries(document.paths).map<RouteInformation>(
    ([key, value]) => {
      if (!value) throw new Error('Invalid schema');
      const methodKeys = ['get', 'post', 'patch', 'delete', 'head'] as const;
      const methods: MethodInformation[] = [];

      for (const methodKey of methodKeys) {
        const operation = value[methodKey];
        if (!operation) continue;
        if (options.tag && !operation.tags?.includes(options.tag)) continue;

        methods.push(buildOperation(methodKey, operation));
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

  for (const route of routes) {
    for (const method of route.methods) {
      // eslint-disable-next-line no-await-in-loop -- Keep order
      s.push(await renderOperation(route.path, method, serverUrl));
    }
  }

  return render(tag?.name, tag?.description, root(...s), options.render);
}

export async function generateTags(
  pathOrDocument: string | OpenAPI.Document,
  options: Omit<GenerateOptions, 'tag'> = {},
): Promise<{ tag: string; content: string }[]> {
  const document = await dereference(pathOrDocument);
  const results = document.tags?.map(async (tag) => {
    return {
      tag: tag.name,
      content: await generate(document, {
        tag: tag.name,
        ...options,
      }),
    };
  });

  return Promise.all(results ?? []);
}

function render(
  title: string | undefined,
  description: string | undefined,
  content: string,
  fn: GenerateOptions['render'],
): string {
  const result = fn?.(title, description, content) ?? {};

  const rendered: RenderResult = {
    frontmatter:
      result.frontmatter ??
      `---
title: ${title}
description: ${description}
---`,
    imports: result.imports ?? [
      `import { Root, API, APIInfo, APIExample, Property } from '@/components/api'`,
      `import { Tabs, Tab } from 'next-docs-ui/components/tabs'`,
      `import { Accordion, Accordions } from 'next-docs-ui/components/accordion';`,
    ],
    content: result.content ?? content,
  };

  return [rendered.frontmatter, rendered.imports.join('\n'), rendered.content]
    .filter(Boolean)
    .join('\n\n');
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
