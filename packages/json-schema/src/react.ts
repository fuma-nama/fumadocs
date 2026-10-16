import type { ReactNode } from 'react';
import { fromTranslations } from '@fuma-translate/react';
import { dereference, type JsonSchema, mergeAllOf, stringify } from './index';

/** a labelled value, a labelled list of values, or a custom node */
export type InfoTag =
  | {
      label: ReactNode;
      value: ReactNode;
      /** render as a block instead of inline */
      block?: boolean;
      /** the value is prose, like a Markdown description */
      prose?: boolean;
    }
  | { label: ReactNode; list: string[] }
  | { node: ReactNode };

export interface FieldBase {
  description?: ReactNode;
  infoTags?: InfoTag[];

  typeName: string;
  aliasName: string;

  deprecated?: boolean;
}

export interface SchemaDataObjectProperty {
  name: string;
  $type: string;
  required: boolean;
}

export type SchemaData = FieldBase &
  (
    | {
        type: 'primitive';
      }
    | {
        type: 'object';
        props: SchemaDataObjectProperty[];
      }
    | {
        type: 'array';
        item: {
          $type: string;
        };
      }
    | {
        type: 'or';
        items: {
          name: string;
          $type: string;
        }[];
      }
    | {
        type: 'and';
        items: {
          name: string;
          $type: string;
        }[];
      }
  );

export interface SchemaUIGeneratedData {
  $root: string;
  /** the data of schemas by ID, generated when first read */
  refs: Record<string, SchemaData>;
}

export interface GenerateSchemaUIOptions {
  root: JsonSchema;
  renderMarkdown: (md: string) => ReactNode;
  renderCodeblock: (opts: { lang: string; code: string }) => ReactNode;

  /**
   * include read only props
   */
  readOnly?: boolean;
  /**
   * include write only props
   */
  writeOnly?: boolean;

  /**
   * Show example values as tags
   *
   * @default false
   */
  showExample?: boolean;
  translations?: Partial<Record<string, string>>;
}

export function generateSchemaUI({
  root,
  renderMarkdown,
  renderCodeblock,
  readOnly = false,
  writeOnly = false,
  showExample = false,
  translations = {},
}: GenerateSchemaUIOptions): SchemaUIGeneratedData {
  const t = fromTranslations(translations, { note: 'schema UI' });
  const schemas = new Map<string, JsonSchema>();
  // a UI only reads the schemas it shows
  const refs = new Proxy<Record<string, SchemaData>>(
    {},
    {
      get(generated, id) {
        if (typeof id === 'string' && !(id in generated)) {
          const raw = schemas.get(id);
          if (raw !== undefined) generated[id] = generate(id, raw);
        }
        return Reflect.get(generated, id);
      },
    },
  );

  function generateInfoTags(schema: Exclude<JsonSchema, boolean>) {
    const inlines: InfoTag[] = [];
    const blocks: InfoTag[] = [];

    if (schema.pattern) {
      inlines.push({ label: t('Match'), value: schema.pattern });
    }

    if (schema.format) {
      inlines.push({ label: t('Format'), value: schema.format });
    }

    if (schema.multipleOf) {
      inlines.push({ label: t('Multiple Of'), value: schema.multipleOf });
    }

    let range = formatRange(
      'value',
      schema.minimum,
      schema.exclusiveMinimum,
      schema.maximum,
      schema.exclusiveMaximum,
    );
    if (range) {
      inlines.push({ label: t('Range'), value: range });
    }

    range = formatRange('length', schema.minLength, undefined, schema.maxLength, undefined);
    if (range) {
      inlines.push({ label: t('Length'), value: range });
    }

    range = formatRange(
      'properties',
      schema.minProperties,
      undefined,
      schema.maxProperties,
      undefined,
    );
    if (range) {
      inlines.push({ label: t('Properties'), value: range });
    }

    range = formatRange('items', schema.minItems, undefined, schema.maxItems, undefined);
    if (range) {
      inlines.push({ label: t('Items'), value: range });
    }

    if (schema.enum && schema.enum.length > 0) {
      blocks.push({
        label: t('Value in'),
        list: schema.enum.map((value) => JSON.stringify(value, null, 2)),
      });
    }

    if (schema.default !== undefined) {
      const defaultCode = JSON.stringify(schema.default, null, 2);
      if (defaultCode.includes('\n')) {
        blocks.push({
          label: t('Default'),
          block: true,
          value: renderCodeblock({ lang: 'json', code: defaultCode }),
        });
      } else {
        inlines.push({ label: t('Default'), value: defaultCode });
      }
    }

    if (showExample && schema.examples) {
      for (const example of schema.examples) {
        const code = JSON.stringify(example, null, 2);

        if (code.includes('\n')) {
          blocks.push({
            label: t('Example'),
            block: true,
            value: renderCodeblock({ lang: 'json', code }),
          });

          continue;
        }

        inlines.push({ label: t('Example'), value: code });
      }
    }

    return [...inlines, ...blocks];
  }

  /**
   * Add a schema to `refs`, a schema without `$ref` is identified by its position under the parent,
   * so links to it don't depend on the schemas opened before.
   */
  function add(raw: JsonSchema, position: string): string {
    const id =
      typeof raw === 'boolean' ? String(raw) : typeof raw.$ref === 'string' ? raw.$ref : position;
    schemas.set(id, raw);
    return id;
  }

  function isVisible(raw: JsonSchema): boolean {
    const schema = dereference(raw);
    if (typeof schema === 'boolean') return true;
    if (schema.writeOnly) return writeOnly;
    if (schema.readOnly) return readOnly;
    return true;
  }

  function base(raw: JsonSchema): FieldBase {
    const schema = dereference(raw);
    if (typeof schema === 'boolean') {
      const name = schema ? 'any' : 'never';
      return {
        typeName: name,
        aliasName: name,
      };
    }

    return {
      description: schema.description ? renderMarkdown(schema.description) : undefined,
      infoTags: generateInfoTags(schema),
      typeName: stringify(raw),
      aliasName: stringify(raw, { alias: true }),
      deprecated: schema.deprecated,
    };
  }

  function generate(id: string, raw: JsonSchema): SchemaData {
    const schema = dereference(raw);
    if (typeof schema === 'boolean') return { type: 'primitive', ...base(raw) };

    if (Array.isArray(schema.type)) {
      const items: { name: string; $type: string }[] = [];
      for (const type of schema.type) {
        const $type = `${id}_type:${type}`;
        schemas.set($type, { ...schema, type });
        items.push({ name: type, $type });
      }
      return { type: 'or', items, ...base(raw) };
    }

    if (schema.oneOf && schema.anyOf) {
      const items: { name: string; $type: string }[] = [];
      for (const omit of ['anyOf', 'oneOf'] as const) {
        const $type = `${id}_omit:${omit}`;
        schemas.set($type, { ...schema, [omit]: undefined });
        items.push({ name: refs[$type].aliasName, $type });
      }
      return { type: 'and', items, ...base(raw) };
    }

    // display both `oneOf` & `anyOf` as OR for simplified overview
    const union = schema.oneOf ?? schema.anyOf;
    if (union) {
      const items: { name: string; $type: string }[] = [];
      for (const [i, rawItem] of union.entries()) {
        if (!rawItem || typeof rawItem !== 'object' || !isVisible(rawItem)) continue;
        const item = dereference(rawItem);
        if (typeof item !== 'object') continue;
        const $type = `${id}_extends:${typeof rawItem.$ref === 'string' ? rawItem.$ref : i}`;

        schemas.set($type, {
          ...schema,
          oneOf: undefined,
          anyOf: undefined,
          ...item,
          properties: {
            ...schema.properties,
            ...item.properties,
          },
        });
        items.push({ $type, name: stringify(rawItem, { alias: true }) });
      }
      return { type: 'or', items, ...base(raw) };
    }

    if (schema.allOf) return generate(id, mergeAllOf(schema));

    if (schema.type === 'object') {
      const { properties = {}, patternProperties, additionalProperties } = schema;
      const entries = Object.entries(properties);
      if (patternProperties) entries.push(...Object.entries(patternProperties));

      const props: SchemaDataObjectProperty[] = [];
      for (const [i, [key, prop]] of entries.entries()) {
        if (!prop || !isVisible(prop)) continue;
        props.push({
          $type: add(prop, `${id}#${i}`),
          name: key,
          required: schema.required?.includes(key) ?? false,
        });
      }

      if (additionalProperties && isVisible(additionalProperties)) {
        props.push({
          $type: add(additionalProperties, `${id}#*`),
          name: '[key: string]',
          required: false,
        });
      }
      return { type: 'object', props, ...base(raw) };
    }

    if (schema.type === 'array') {
      return {
        type: 'array',
        item: { $type: add(schema.items ?? true, `${id}#items`) },
        ...base(raw),
      };
    }

    return { type: 'primitive', ...base(raw) };
  }

  return {
    refs,
    $root: add(root, '__root'),
  };
}

function formatRange(
  value: string,
  min: number | undefined,
  exclusiveMin: number | undefined,
  max: number | undefined,
  exclusiveMax: number | undefined,
) {
  const out: string[] = [];
  if (min !== undefined) {
    out.push(`${min} <=`);
  } else if (exclusiveMin !== undefined) {
    out.push(`${exclusiveMin} <`);
  }

  out.push(value);
  if (max !== undefined) {
    out.push(`<= ${max}`);
  } else if (exclusiveMax !== undefined) {
    out.push(`< ${exclusiveMax}`);
  }
  if (out.length > 1) return out.join(' ');
}
