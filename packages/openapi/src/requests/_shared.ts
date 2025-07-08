import type { MediaAdapter } from '@/media/adapter';
import type { NoReference } from '@/utils/schema';
import type { ParameterObject } from '@/types';

export type SampleGenerator = (
  url: string,
  data: RequestData,
  context: {
    mediaAdapters: Record<string, MediaAdapter>;
  },
) => string;

export interface RawRequestData {
  method: string;

  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  cookie: Record<string, unknown>;

  body?: unknown;
  bodyMediaType?: string;
}

interface EncodedParameter {
  readonly value: string | string[];
}

export interface RequestData {
  method: string;

  path: Record<string, EncodedParameter>;
  query: Record<string, EncodedParameter>;
  header: Record<string, EncodedParameter>;
  cookie: Record<string, EncodedParameter>;

  body?: unknown;
  bodyMediaType?: string;
}

const FormDelimiter = {
  spaceDelimited: ' ',
  pipeDelimited: '|',
};

const PathPrefix = {
  label: '.',
  matrix: ';',
};

export function ident(code: string, tab: number = 1) {
  return code
    .split('\n')
    .map((v) => '  '.repeat(tab) + v)
    .join('\n');
}

export function encodeRequestData(
  from: RawRequestData,
  adapters: Record<string, MediaAdapter>,
  parameters: NoReference<ParameterObject>[],
): RequestData {
  function getMediaEncoder(field: NoReference<ParameterObject>) {
    if (!field.content) return;

    for (const k in field.content) {
      if (k in adapters) {
        return (v: unknown) => String(adapters[k].encode({ body: v }));
      }
    }
  }

  function writeObject(
    parentKey: string,
    value: object,
    deep: boolean,
    output: Record<string, EncodedParameter>,
  ) {
    for (const k in value) {
      const prop: unknown = value[k as keyof object];
      if (prop == null) continue;

      const key = deep ? `${parentKey}[${k}]` : k;
      if (!deep || typeof prop !== 'object') {
        output[key] = {
          value: String(prop),
        };

        continue;
      }

      writeObject(key, value, deep, output);
    }
  }

  function write(
    key: string,
    value: unknown,
    field: NoReference<ParameterObject>,
    output: Record<string, EncodedParameter> = {},
  ): Record<string, EncodedParameter> {
    const encoder = getMediaEncoder(field);
    if (encoder) {
      output[key] = { value: encoder(value) };
      return output;
    }

    const explode = field.explode ?? true;
    let prefix = '';
    let sep = ',';

    if (field.in === 'path') {
      const style = field.style ?? 'simple';

      if (style in PathPrefix) {
        prefix = PathPrefix[style as keyof typeof PathPrefix];

        if (explode) sep = prefix;
      }
    }

    if (Array.isArray(value)) {
      // header & cookie doesn't support explode for array values
      if (explode && field.in !== 'header' && field.in !== 'cookie') {
        output[key] = {
          value: prefix + value.map(String),
        };
        return output;
      }

      if (field.in === 'query') {
        const style = field.style ?? 'form';

        if (style in FormDelimiter)
          sep = FormDelimiter[style as keyof typeof FormDelimiter];
      }

      output[key] = {
        value: prefix + value.map(String).join(sep),
      };
      return output;
    }

    if (typeof value === 'object' && value) {
      // header & path creates key-value pairs
      if (explode && (field.in === 'header' || field.in === 'path')) {
        output[key] = {
          value:
            prefix +
            Object.entries(value)
              .map(([k, v]) => `${k}=${v}`)
              .join(sep),
        };
        return output;
      }

      if (explode || field.style === 'deepObject') {
        writeObject(key, value, field.style === 'deepObject', output);
        return output;
      }

      output[key] = {
        value: prefix + Object.entries(value).flat().join(sep),
      };
      return output;
    }

    output[key] = {
      value: prefix + String(value),
    };
    return output;
  }

  const result: Partial<RequestData> = {
    method: from.method,
    body: from.body,
    bodyMediaType: from.bodyMediaType,
  };

  for (const type of ['cookie', 'query', 'header', 'path'] as const) {
    const out = {};
    for (const k in from[type]) {
      const value = from[type][k];
      if (value == null) continue;

      const field = parameters.find((p) => p.name === k && p.in === type);
      if (!field) continue;

      write(k, value, field, out);
    }

    result[type] = out;
  }

  return result as RequestData;
}
