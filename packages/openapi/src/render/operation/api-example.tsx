import * as CURL from '@/requests/curl';
import * as JS from '@/requests/javascript';
import * as Go from '@/requests/go';
import * as Python from '@/requests/python';
import type { MethodInformation, RenderContext } from '@/types';
import type { EndpointSample } from '@/utils/generate-sample';
import { type ReactNode } from 'react';
import { Markdown } from '@/render/markdown';
import { type CodeSample } from '@/render/operation';
import type { ResponseTypeProps } from '@/render/renderer';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';

const defaultSamples: CodeSample[] = [
  {
    label: 'cURL',
    source: CURL.getSampleRequest,
    lang: 'bash',
  },
  {
    label: 'JavaScript',
    source: JS.getSampleRequest,
    lang: 'js',
  },
  {
    label: 'Go',
    source: Go.getSampleRequest,
    lang: 'go',
  },
  {
    label: 'Python',
    source: Python.getSampleRequest,
    lang: 'python',
  },
];

interface CustomProperty {
  'x-codeSamples'?: CodeSample[];
  'x-selectedCodeSample'?: string;
  'x-exclusiveCodeSample'?: string;
}

interface CodeSampleCompiled {
  lang: string;
  label: string;
  source: string;
}

interface CollectedSample {
  samples: CodeSampleCompiled[];
  title: string;
  description?: string;
}

export async function APIExample({
  method,
  endpoint,
  ctx,
}: {
  method: MethodInformation & CustomProperty;
  endpoint: EndpointSample;
  ctx: RenderContext;
}) {
  const renderer = ctx.renderer;
  const samples = new Map<string, CollectedSample>();
  let children: ReactNode;

  for (const [key, sample] of Object.entries(
    endpoint.body?.samples ?? {
      // fallback for methods that have no request body, we also want to show examples for
      _default: {},
    },
  )) {
    samples.set(key, {
      title: sample?.summary ?? key,
      description: sample?.description,
      samples: dedupe([
        ...defaultSamples,
        ...(ctx.generateCodeSamples
          ? await ctx.generateCodeSamples(endpoint)
          : []),
        ...(method['x-codeSamples'] ?? []),
      ]).flatMap((sample) => {
        if (sample.source === false) return [];

        const result =
          typeof sample.source === 'function'
            ? sample.source(endpoint, key)
            : sample.source;
        if (result === undefined) return [];

        return {
          ...sample,
          source: result,
        };
      }),
    });
  }

  function renderRequest(sample: CollectedSample) {
    return (
      <renderer.Requests items={sample.samples.map((s) => s.label)}>
        {sample.samples.map((s) => (
          <renderer.Request
            key={s.label}
            name={s.label}
            code={s.source}
            language={s.lang}
          />
        ))}
      </renderer.Requests>
    );
  }

  if (
    (samples.size === 1 && samples.has('_default')) ||
    (method['x-exclusiveCodeSample'] &&
      samples.has(method['x-exclusiveCodeSample']))
  ) {
    // if exclusiveSampleKey is present, we don't use tabs
    // if only the fallback or non described openapi legacy example is present, we don't use tabs
    children = renderRequest(
      samples.get(method['x-exclusiveCodeSample'] ?? '_default')!,
    );
  } else if (samples.size > 0) {
    const entries = Array.from(samples.entries());

    children = (
      <renderer.Samples
        items={entries.map(([key, sample]) => ({
          title: sample.title,
          description: sample.description ? (
            <Markdown text={sample.description} />
          ) : null,
          value: key,
        }))}
        defaultValue={method['x-selectedCodeSample']}
      >
        {entries.map(([key, sample]) => (
          <renderer.Sample key={key} value={key}>
            {renderRequest(sample)}
          </renderer.Sample>
        ))}
      </renderer.Samples>
    );
  }

  return (
    <renderer.APIExample>
      {children}
      <ResponseTabs operation={method} ctx={ctx} endpoint={endpoint} />
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
  endpoint,
  operation,
  ctx: { renderer, generateTypeScriptSchema, schema },
}: {
  endpoint: EndpointSample;
  operation: MethodInformation;
  ctx: RenderContext;
}) {
  if (!operation.responses) return null;

  async function renderResponse(code: string) {
    const types: ResponseTypeProps[] = [];

    let description = operation.responses?.[code].description;
    if (!description && code in endpoint.responses)
      description = endpoint.responses[code].schema.description ?? '';

    if (code in endpoint.responses) {
      types.push({
        lang: 'json',
        label: 'Response',
        code: JSON.stringify(endpoint.responses[code].sample, null, 2),
      });
    }

    let ts: string | undefined;
    if (generateTypeScriptSchema) {
      ts = await generateTypeScriptSchema(endpoint, code);
    } else if (generateTypeScriptSchema === undefined) {
      ts = await getTypescriptSchema(endpoint, code, schema.dereferenceMap);
    }

    if (ts) {
      types.push({
        code: ts,
        lang: 'ts',
        label: 'TypeScript',
      });
    }

    return (
      <renderer.Response value={code}>
        {description ? <Markdown text={description} /> : null}
        {types.length > 0 ? (
          <renderer.ResponseTypes>
            {types.map((type) => (
              <renderer.ResponseType key={type.lang} {...type} />
            ))}
          </renderer.ResponseTypes>
        ) : null}
      </renderer.Response>
    );
  }

  const codes = Object.keys(operation.responses);
  if (codes.length === 0) return null;

  return (
    <renderer.Responses items={codes}>
      {codes.map((code) => (
        <renderer.Response key={code} value={code}>
          {renderResponse(code)}
        </renderer.Response>
      ))}
    </renderer.Responses>
  );
}
