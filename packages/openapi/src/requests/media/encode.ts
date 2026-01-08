import type { MediaAdapter } from '@/requests/media/adapter';
import { resolveMediaAdapter } from '@/requests/media/adapter';
import type { NoReference } from '@/utils/schema';
import type { ParameterObject } from '@/types';
import type { RawRequestData, RequestData } from '@/requests/types';

export interface EncodedParameter {
  readonly value: string;
}

export interface EncodedParameterMultiple {
  readonly values: string[];
}

/**
 * serialize parameters, see https://swagger.io/docs/specification/v3_0/serialization.
 */
export function encodeRequestData(
  from: RawRequestData,
  adapters: Record<string, MediaAdapter>,
  parameters: NoReference<ParameterObject>[],
): RequestData {
  const result: RequestData = {
    method: from.method,
    body: from.body,
    bodyMediaType: from.bodyMediaType,
    cookie: {},
    header: {},
    path: {},
    query: {},
  };

  for (const type of ['cookie', 'query', 'header', 'path'] as const) {
    for (const key in from[type]) {
      const value = from[type][key];
      if (value == null) continue;

      const field: NoReference<ParameterObject> = parameters.find(
        (p) => p.name === key && p.in === type,
      ) ?? {
        name: key,
        in: type,
      };

      const encoder = getMediaEncoder(field, adapters);
      if (encoder) {
        result[type][key] = { value: encoder(value) };
        continue;
      }

      switch (type) {
        case 'path':
          serializePathParameter(field, value, result.path);
          break;
        case 'query':
          serializeQueryParameter(field, value, result.query);
          break;
        case 'header': {
          result.header[key] = {
            value: serializeSimple(value, field.explode ?? false),
          };
          break;
        }
        case 'cookie':
          serializeCookieParameter(field, value, result.cookie);
          break;
      }
    }
  }

  return result;
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

function serializeSimple(value: NonNullable<unknown>, explode: boolean): string {
  if (Array.isArray(value)) {
    return value.join(',');
  }
  if (typeof value === 'object') {
    return explode
      ? Object.entries(value)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
      : Object.entries(value).flat().join(',');
  }
  return String(value);
}

function serializePathParameter(
  field: NoReference<ParameterObject>,
  value: NonNullable<unknown>,
  // write output
  output: Record<string, EncodedParameter>,
): void {
  const { explode = false, name } = field;

  switch (field.style) {
    case 'label':
      if (Array.isArray(value)) {
        output[field.name] = {
          value: '.' + value.join(explode ? '.' : ','),
        };
        break;
      }
      if (typeof value === 'object') {
        output[field.name] = {
          value:
            '.' +
            (explode
              ? Object.entries(value)
                  .map(([k, v]) => `${k}=${v}`)
                  .join('.')
              : Object.entries(value).flat().join(',')),
        };
        break;
      }
      output[field.name] = {
        value: `.${value}`,
      };
      break;
    case 'matrix': {
      const specifier = `;${name}=`;

      if (Array.isArray(value)) {
        output[field.name] = {
          value: explode
            ? `${specifier}${value.join(',')}`
            : `${specifier}${value.join(specifier)}`,
        };
        break;
      }
      if (typeof value === 'object') {
        output[field.name] = {
          value: explode
            ? Object.entries(value)
                .map(([k, v]) => `;${k}=${v}`)
                .join('')
            : specifier + Object.entries(value).flat().join(','),
        };
        break;
      }

      output[field.name] = {
        value: `${specifier}${value}`,
      };
      break;
    }
    // simple
    default:
      output[field.name] = {
        value: serializeSimple(value, explode),
      };
  }
}

function serializeQueryParameter(
  field: NoReference<ParameterObject>,
  value: NonNullable<unknown>,
  // write output
  output: Record<string, EncodedParameterMultiple>,
): void {
  const { explode = true } = field;

  switch (field.style) {
    case 'spaceDelimited':
      if (!explode && Array.isArray(value)) {
        output[field.name] = {
          values: [value.join(' ')],
        };
        break;
      }
    case 'pipeDelimited':
      if (!explode && Array.isArray(value)) {
        output[field.name] = {
          values: [value.join('|')],
        };
        break;
      }
    case 'deepObject':
      if (!Array.isArray(value) && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          output[`${field.name}[${k}]`] = {
            // note: the behaviour of nested array is undefined, we do this to avoid edge cases
            values: Array.isArray(v) ? v : [String(v)],
          };
        }
        break;
      }
    // form
    default:
      if (Array.isArray(value)) {
        output[field.name] = {
          values: explode ? value : [value.join(',')],
        };
        break;
      }

      if (typeof value === 'object' && explode) {
        for (const [k, v] of Object.entries(value)) {
          output[k] = {
            values: [String(v)],
          };
        }
        break;
      }

      if (typeof value === 'object') {
        output[field.name] = {
          values: [Object.entries(value).flat().join(',')],
        };
        break;
      }

      output[field.name] = {
        values: [String(value)],
      };
  }
}

function serializeCookieParameter(
  field: NoReference<ParameterObject>,
  value: NonNullable<unknown>,
  // write output
  output: Record<string, EncodedParameter>,
) {
  const { explode = true } = field;

  // form
  if (Array.isArray(value)) {
    output[field.name] = {
      value: explode ? value.map((v) => `${field.name}=${v}`).join('&') : value.join(','),
    };
  } else if (typeof value === 'object' && explode) {
    for (const [k, v] of Object.entries(value)) {
      output[k] = {
        value: String(v),
      };
    }
  } else if (typeof value === 'object') {
    output[field.name] = {
      value: Object.entries(value).flat().join(','),
    };
  } else {
    output[field.name] = {
      value: String(value),
    };
  }
}
