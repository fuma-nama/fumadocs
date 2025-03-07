import type { MethodInformation, RenderContext } from '@/types';
import { type ReactNode } from 'react';
import { Markdown } from '@/render/markdown';
import { type CodeSample } from '@/render/operation/index';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { CodeBlock } from '@/render/codeblock';
import {
  CodeExample,
  CodeExampleProvider,
} from '@/ui/contexts/code-example.lazy';
import { getPreferredType, type NoReference } from '@/utils/schema';
import { getRequestData } from '@/render/operation/get-request-data';
import { sample } from 'openapi-sampler';
import type { RequestData } from '@/requests/_shared';

const defaultSamples: CodeSample[] = [
  {
    label: 'cURL',
    lang: 'bash',
  },
  {
    label: 'JavaScript',
    lang: 'js',
  },
  {
    label: 'Go',
    lang: 'go',
  },
  {
    label: 'Python',
    lang: 'python',
  },
];

interface CustomProperty {
  'x-codeSamples'?: CodeSample[];
  'x-selectedCodeSample'?: string;
  'x-exclusiveCodeSample'?: string;
}

interface CodeExampleItem {
  key: string;

  name: string;
  description?: string;
  data: RequestData;
}

export function APIExampleProvider({
  examples,
  method,
  children,
  route,
}: {
  examples: CodeExampleItem[];
  method: MethodInformation & CustomProperty;
  route: string;
  children: ReactNode;
}) {
  const exclusiveSampleKey = method['x-exclusiveCodeSample'];

  return (
    <CodeExampleProvider
      initialKey={exclusiveSampleKey}
      route={route}
      examples={examples.map((example) => ({
        key: example.key,
        data: example.data,
      }))}
    >
      {children}
    </CodeExampleProvider>
  );
}

export function getAPIExamples(
  path: string,
  method: MethodInformation,
  ctx: RenderContext,
): CodeExampleItem[] {
  const media = method.requestBody
    ? getPreferredType(method.requestBody.content)
    : null;
  const bodyOfType = media ? method.requestBody?.content[media] : null;

  if (bodyOfType?.examples) {
    const result: CodeExampleItem[] = [];

    for (const [key, value] of Object.entries(bodyOfType.examples)) {
      result.push({
        key,
        name: value.summary ?? key,
        description: value.description,

        data: getRequestData(path, method, key, ctx),
      });
    }

    return result;
  }

  return [
    {
      key: '_default',
      name: 'Default',
      description: bodyOfType?.schema?.description,
      data: getRequestData(path, method, null, ctx),
    },
  ];
}

export async function APIExample({
  method,
  examples,
  ctx,
}: {
  examples: CodeExampleItem[];
  method: MethodInformation & CustomProperty;
  ctx: RenderContext;
}) {
  const renderer = ctx.renderer;
  const generators = dedupe([
    ...defaultSamples,
    ...(ctx.generateCodeSamples ? await ctx.generateCodeSamples(method) : []),
    ...(method['x-codeSamples'] ?? []),
  ]).filter((generator) => generator.source !== false);

  const exclusiveSampleKey = method['x-exclusiveCodeSample'];

  return (
    <renderer.APIExample>
      {examples.length > 1 && !exclusiveSampleKey && (
        <renderer.CodeExampleSelector
          items={examples.map((sample) => ({
            title: sample.name,
            description: sample.description ? (
              <Markdown text={sample.description} />
            ) : null,
            value: sample.key,
          }))}
        />
      )}
      {generators.length > 0 && (
        <renderer.Requests items={generators.map((s) => s.label)}>
          {generators.map((generator) => (
            <renderer.Request key={generator.label} name={generator.label}>
              <CodeExample {...generator} />
            </renderer.Request>
          ))}
        </renderer.Requests>
      )}
      <ResponseTabs operation={method} ctx={ctx} />
    </renderer.APIExample>
  );
}

/**
 * Remove duplicated labels
 */
function dedupe(samples: CodeSample[]): CodeSample[] {
  const set = new Set<string>();
  const out: CodeSample[] = [];

  for (let i = samples.length - 1; i >= 0; i--) {
    if (set.has(samples[i].label)) continue;

    set.add(samples[i].label);
    out.unshift(samples[i]);
  }
  return out;
}

function ResponseTabs({
  operation,
  ctx: { renderer, generateTypeScriptSchema, schema },
}: {
  operation: NoReference<MethodInformation>;
  ctx: RenderContext;
}) {
  if (!operation.responses) return null;

  async function renderResponse(code: string) {
    const response =
      operation.responses && code in operation.responses
        ? operation.responses[code]
        : null;

    const media = getPreferredType(response?.content ?? {});
    const responseOfType = media ? response?.content?.[media] : null;

    const description =
      operation.responses?.[code].description ??
      responseOfType?.schema?.description ??
      '';

    let ts: string | undefined;
    if (generateTypeScriptSchema) {
      ts = await generateTypeScriptSchema(operation, code);
    } else if (
      generateTypeScriptSchema === undefined &&
      responseOfType?.schema
    ) {
      ts = await getTypescriptSchema(
        responseOfType?.schema,
        schema.dereferenceMap,
      );
    }

    const values: string[] = [];
    let exampleSlot: ReactNode;

    if (responseOfType?.examples) {
      exampleSlot = Object.entries(responseOfType.examples).map(
        ([key, sample], i) => {
          const title = sample?.summary ?? `Example ${i + 1}`;

          values.push(title);
          return (
            <renderer.ResponseType key={key} label={title}>
              {sample?.description ? (
                <Markdown text={sample.description} />
              ) : null}
              <CodeBlock
                lang="json"
                code={JSON.stringify(sample.value, null, 2)}
              />
            </renderer.ResponseType>
          );
        },
      );
    } else if (responseOfType?.example || responseOfType?.schema) {
      values.push('Response');

      exampleSlot = (
        <renderer.ResponseType label="Response">
          <CodeBlock
            lang="json"
            code={JSON.stringify(
              responseOfType.example ?? sample(responseOfType.schema as object),
              null,
              2,
            )}
          />
        </renderer.ResponseType>
      );
    }

    return (
      <renderer.Response value={code}>
        {description ? <Markdown text={description} /> : null}
        {exampleSlot ? (
          <renderer.ResponseTypes defaultValue={values[0]}>
            {exampleSlot}
            {ts ? (
              <renderer.ResponseType label="TypeScript">
                <CodeBlock code={ts} lang="ts" />
              </renderer.ResponseType>
            ) : null}
          </renderer.ResponseTypes>
        ) : null}
      </renderer.Response>
    );
  }

  const codes = Object.keys(operation.responses);
  if (codes.length === 0) return null;

  return (
    <renderer.Responses items={codes}>
      {codes.map((code) => renderResponse(code))}
    </renderer.Responses>
  );
}
