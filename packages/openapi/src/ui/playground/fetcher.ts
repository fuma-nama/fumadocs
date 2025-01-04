import { resolve } from '@/ui/playground/resolve';
import { type ReferenceSchema, type RequestSchema } from '@/render/playground';
import { type DynamicField } from '@/ui/contexts/schema';

export interface FetchOptions {
  url: string;
  method: string;

  header: Record<string, unknown>;

  body?: {
    mediaType: string;
    value: unknown;
  };
  dynamicFields?: Map<string, DynamicField>;
}

export interface FetchResult {
  status: number;
  type: 'json' | 'html' | 'text';
  data: unknown;
}

export interface Fetcher {
  /**
   * @param input - fetch request inputs
   * @param dynamicFields - schema of dynamic fields, given by the playground client
   */
  fetch: (options: FetchOptions) => Promise<FetchResult>;
}

/**
 * @param bodySchema - schema of body
 * @param references - defined references of schemas, needed for resolve cyclic references
 */
export function createBrowserFetcher(
  bodySchema: RequestSchema | undefined,
  references: Record<string, RequestSchema>,
): Fetcher {
  return {
    async fetch(options) {
      const headers = new Headers();
      if (options.body && options.body.mediaType !== 'multipart/form-data')
        headers.append('Content-Type', options.body.mediaType);

      for (const key of Object.keys(options.header)) {
        const paramValue = options.header[key];

        if (typeof paramValue === 'string' && paramValue.length > 0)
          headers.append(key, paramValue.toString());
      }

      return fetch(options.url, {
        method: options.method,
        cache: 'no-cache',
        headers,
        body:
          bodySchema && options.body
            ? await createBodyFromValue(
                options.body.mediaType,
                options.body.value,
                bodySchema,
                references,
                options.dynamicFields ?? new Map(),
              )
            : undefined,
        signal: AbortSignal.timeout(10 * 1000),
      })
        .then(async (res) => {
          const contentType = res.headers.get('Content-Type') ?? '';
          let type: FetchResult['type'];
          let data: unknown;

          if (contentType.startsWith('application/json')) {
            type = 'json';
            data = await res.json();
          } else {
            type = contentType.startsWith('text/html') ? 'html' : 'text';
            data = await res.text();
          }

          return { status: res.status, type, data };
        })
        .catch((e) => {
          const message =
            e instanceof Error ? `[${e.name}] ${e.message}` : e.toString();

          return {
            status: 400,
            type: 'text',
            data: `Client side error: ${message}`,
          };
        });
    },
  };
}

/**
 * Create request body from value
 */
export async function createBodyFromValue(
  mediaType: string,
  value: unknown,
  schema: RequestSchema,
  references: Record<string, RequestSchema>,
  dynamicFields: Map<string, DynamicField>,
): Promise<string | FormData> {
  const result = convertValue('body', value, schema, references, dynamicFields);

  if (mediaType === 'application/json') {
    return JSON.stringify(result);
  }

  if (mediaType === 'application/xml') {
    const { js2xml } = await import('xml-js');

    return js2xml(result as Record<string, unknown>, {
      compact: true,
      spaces: 2,
    });
  }

  const formData = new FormData();

  if (typeof result !== 'object' || !result) {
    throw new Error(
      `Unsupported body type: ${typeof result}, expected: object`,
    );
  }

  for (const key of Object.keys(result)) {
    const prop: unknown = result[key as keyof object];

    if (typeof prop === 'object' && prop instanceof File) {
      formData.set(key, prop);
    }

    if (Array.isArray(prop) && prop.every((item) => item instanceof File)) {
      for (const item of prop) {
        formData.append(key, item);
      }
    }

    if (prop && !(prop instanceof File)) {
      formData.set(key, JSON.stringify(prop));
    }
  }

  return formData;
}

/**
 * Convert a value (object or string) to the corresponding type of schema
 *
 * @param fieldName - field name of value
 * @param value - the original value
 * @param schema - the schema of field
 * @param references - schema references
 * @param dynamicFields - Dynamic references
 */
function convertValue(
  fieldName: string,
  value: unknown,
  schema: RequestSchema,
  references: Record<string, RequestSchema>,
  dynamicFields: Map<string, DynamicField>,
): unknown {
  const isEmpty = value === '' || value === undefined || value === null;
  if (isEmpty && schema.isRequired)
    return schema.type === 'boolean' ? false : '';
  else if (isEmpty) return undefined;

  if (Array.isArray(value) && schema.type === 'array') {
    return value.map((item: unknown, index) =>
      convertValue(
        `${fieldName}.${String(index)}`,
        item,
        resolve(schema.items, references),
        references,
        dynamicFields,
      ),
    );
  }

  if (schema.type === 'switcher') {
    return convertValue(
      fieldName,
      value,
      resolve(
        getDynamicFieldSchema(
          fieldName,
          dynamicFields,
          Object.values(schema.items).at(0),
        ),
        references,
      ),
      references,
      dynamicFields,
    );
  }

  if (typeof value === 'object' && schema.type === 'object') {
    const entries = Object.keys(value).map((key) => {
      const prop = value[key as keyof object];
      const propFieldName = `${fieldName}.${key}`;

      if (key in schema.properties) {
        return [
          key,
          convertValue(
            propFieldName,
            prop,
            resolve(schema.properties[key], references),
            references,
            dynamicFields,
          ),
        ];
      }

      if (schema.additionalProperties) {
        const schema = resolve(
          getDynamicFieldSchema(propFieldName, dynamicFields),
          references,
        );

        return [
          key,
          convertValue(propFieldName, prop, schema, references, dynamicFields),
        ];
      }

      console.warn('Could not resolve field', propFieldName, dynamicFields);
      return [key, prop];
    });

    return Object.fromEntries(entries);
  }

  switch (schema.type) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'null' ? undefined : value === 'true';
    case 'file':
      return value; // file
    default:
      return String(value);
  }
}

function getDynamicFieldSchema(
  name: string,
  dynamicFields: Map<string, DynamicField>,
  defaultValue?: RequestSchema | ReferenceSchema,
): RequestSchema | ReferenceSchema {
  const field = dynamicFields.get(name);

  if (field?.type === 'field') return field.schema;
  if (defaultValue) return defaultValue;

  return { type: 'null', isRequired: false };
}
