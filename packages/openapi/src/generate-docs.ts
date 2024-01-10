import { writeFileSync } from 'node:fs';
import Parser from '@readme/openapi-parser';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';

interface RouteInformation {
  path: string;
  summary?: string;
  description?: string;
  methods: MethodInformation[];
}

interface MethodInformation extends OpenAPI.OperationObject {
  parameters: OpenAPI.ParameterObject[];
  method: string;
}

type NoReference<T> = Exclude<T, OpenAPI.ReferenceObject>;

export async function generate(path: string): Promise<void> {
  const document = (await Parser.dereference(path)) as OpenAPI.Document;

  const routes = Object.entries(document.paths).map<RouteInformation>(
    ([key, value]) => {
      if (!value) throw new Error('Invalid schema');
      const methods: MethodInformation[] = [];

      if (value.get) {
        methods.push(buildOperation('get', value.get));
      }

      if (value.post) {
        methods.push(buildOperation('post', value.post));
      }

      if (value.patch) {
        methods.push(buildOperation('patch', value.patch));
      }

      if (value.delete) {
        methods.push(buildOperation('delete', value.delete));
      }

      if (value.head) {
        methods.push(buildOperation('head', value.head));
      }

      return {
        ...value,
        path: key,
        methods,
      };
    },
  );

  const s: string[] = [];

  routes.forEach((entry) => {
    for (const method of entry.methods) {
      s.push(getOperationContent(entry.path, method));
    }
  });

  writeFileSync('./output.mdx', createElement('Root', {}, ...s));
}

function noRef<T>(v: T): NoReference<T> {
  return v as NoReference<T>;
}

function getOperationContent(path: string, method: MethodInformation): string {
  const info: string[] = [];
  const example: string[] = [];
  info.push(`## ${method.summary}`);
  if (method.description) info.push(p(method.description));

  const body = method.requestBody as NoReference<typeof method.requestBody>;

  if (body) {
    const bodySchema = getPreferredMedia(body.content)?.schema;
    if (!bodySchema) throw new Error();

    info.push(
      `### Request Body${!body.required ? ' (Optional)' : ''}`,
      p(body.description),
      ...schemaElement('body', noRef(bodySchema)),
    );
  }

  const required: string[] = [];
  const optional: string[] = [];

  for (const param of method.parameters) {
    const schema =
      param.schema ?? getPreferredMedia(param.content ?? {})?.schema;

    if (!schema) continue;
    const content = schemaElement(param.name, noRef(schema), false);

    if (param.required) {
      required.push(...content);
    } else {
      optional.push(...content);
    }
  }

  if (required.length > 0) {
    info.push('### Required attributes', ...required);
  }

  if (optional.length > 0) {
    info.push('### Optional attributes', ...optional);
  }

  info.push(getResponseTable(method));

  example.push(getResponseTabs(method));

  return createElement(
    'API',
    {},
    createElement('APIInfo', { method: method.method, route: path }, ...info),
    createElement('APIExample', {}, ...example),
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

function getResponseTabs(operation: OpenAPI.OperationObject): string {
  const codes: string[] = [];
  const tabs: string[] = [];

  Object.entries(operation.responses).forEach(([code, value]) => {
    const response = noRef(value);
    const content = noRef(getPreferredMedia(response.content ?? {}));

    if (content?.example) {
      codes.push(code);

      tabs.push(
        createElement(
          'Tab',
          { value: code },
          [
            `\`\`\`json title=${JSON.stringify(
              content.example ? 'Example Response' : 'Response Schema',
            )}`,
            JSON.stringify(content.example ?? content.schema),
            '```',
          ].join('\n'),
        ),
      );
    }
  });

  if (codes.length === 0) return '';

  return createElement(
    'Tabs',
    {
      items: codes,
    },
    ...tabs,
  );
}

function getPreferredMedia<T>(body: Record<string, T>): T | undefined {
  if (Object.keys(body).length === 0) return undefined;

  if ('application/json' in body) return body['application/json'];

  return Object.values(body)[0];
}

function getSchemaType(schema: OpenAPI.SchemaObject): string {
  if (schema.type === 'array')
    return `array of ${getSchemaType(noRef(schema.items))}`;

  if (schema.oneOf)
    return schema.oneOf.map((one) => getSchemaType(noRef(one))).join(' | ');

  if (schema.allOf)
    return schema.allOf.map((one) => getSchemaType(noRef(one))).join(' & ');

  if (schema.anyOf)
    return schema.anyOf.map((one) => getSchemaType(noRef(one))).join(' & ');

  if (schema.type) return schema.type;

  return 'object';
}

function schemaElement(
  name: string,
  schema: OpenAPI.SchemaObject,
  parseObject = true,
): string[] {
  if (schema.type === 'object' && parseObject) {
    const element: string[] = [];
    const { additionalProperties, properties } = schema;

    if (additionalProperties) {
      if (additionalProperties === true) {
        element.push(property('[key: string]', 'any'));
      } else {
        element.push(
          ...schemaElement('[key: string]', noRef(additionalProperties), false),
        );
      }
    }

    Object.entries(properties ?? {}).forEach(([key, value]) => {
      element.push(...schemaElement(key, noRef(value), false));
    });

    return element;
  }

  const child: string[] = [];

  child.push(p(schema.description));
  if (schema.example)
    child.push(p(`Example: \`${JSON.stringify(schema.example)}\``));
  if (schema.default)
    child.push(p(`Default: \`${JSON.stringify(schema.default)}\``));

  return [property(name, getSchemaType(schema), ...child)];
}

function p(child?: string): string {
  if (!child) return '';
  return child.replace('<', '\\<').replace('>', '\\>');
}

function property(name: string, type: string, ...child: string[]): string {
  return createElement('Property', { name, type }, ...child);
}

function createElement(
  name: string,
  props: object,
  ...child: string[]
): string {
  return [
    `<${name} ${Object.entries(props)
      .map(([key, value]) => `${key}={${JSON.stringify(value)}}`)
      .join(' ')}>`,
    ...child,
    `</${name}>`,
  ].join('\n\n');
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
