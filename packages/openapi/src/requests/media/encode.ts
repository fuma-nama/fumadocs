import type { MediaAdapter } from '@/requests/media/adapter';
import { resolveMediaAdapter } from '@/requests/media/adapter';
import type { NoReference } from '@/utils/schema';
import type { ParameterObject } from '@/types';
import type { RawRequestData, RequestData } from '@/requests/types';

export interface EncodedParameter {
  readonly value: string | string[];
}

const FormDelimiter = {
  spaceDelimited: ' ',
  pipeDelimited: '|',
};

const PathPrefix = {
  label: '.',
  matrix: ';',
};

export function encodeRequestData(
  from: RawRequestData,
  adapters: Record<string, MediaAdapter>,
  parameters: NoReference<ParameterObject>[],
): RequestData {
  const result: Partial<RequestData> = {
    method: from.method,
    body: from.body,
    bodyMediaType: from.bodyMediaType,
  };

  for (const type of ['cookie', 'query', 'header', 'path'] as const) {
    const output: Record<string, EncodedParameter> = {};

    for (const key in from[type]) {
      const value = from[type][key];
      if (value == null) continue;

      const field = parameters.find((p) => p.name === key && p.in === type);
      if (!field) {
        output[key] = { value: String(value) };
        continue;
      }

      const encoder = getMediaEncoder(field, adapters);
      if (encoder) {
        output[key] = { value: encoder(value) };
        continue;
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
          continue;
        }

        if (field.in === 'query') {
          const style = field.style ?? 'form';

          if (style in FormDelimiter)
            sep = FormDelimiter[style as keyof typeof FormDelimiter];
        }

        output[key] = {
          value: prefix + value.map(String).join(sep),
        };
        continue;
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
          continue;
        }

        if (explode || field.style === 'deepObject') {
          writeObject(key, value, field.style === 'deepObject', output);
          continue;
        }

        output[key] = {
          value: prefix + Object.entries(value).flat().join(sep),
        };
        continue;
      }

      output[key] = {
        value: prefix + String(value),
      };
    }

    result[type] = output;
  }

  return result as RequestData;
}

function getMediaEncoder(
  field: NoReference<ParameterObject>,
  adapters: Record<string, MediaAdapter>,
) {
  if (!field.content) return;

  for (const k in field.content) {
    const adapter = resolveMediaAdapter(k, adapters);
    if (adapter) {
      return (v: unknown) => String(adapter.encode({ body: v }));
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
