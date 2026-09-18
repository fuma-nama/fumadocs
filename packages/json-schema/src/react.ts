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
  const refs: Record<string, SchemaData> = {};

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

  let _counter = 0;
  const autoIds = new WeakMap<Exclude<JsonSchema, boolean>, string>();
  function getSchemaId(schema: JsonSchema): string {
    if (typeof schema === 'boolean') return String(schema);
    const rawRef = typeof schema.$ref === 'string' ? schema.$ref : undefined;
    if (rawRef) return rawRef;

    const prev = autoIds.get(schema);
    if (prev) return prev;

    const generated = `__${_counter++}`;
    autoIds.set(schema, generated);
    return generated;
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

  function scanRefs(id: string, raw: JsonSchema) {
    if (id in refs) return;
    const schema = dereference(raw);
    if (typeof schema === 'boolean') {
      refs[id] = {
        type: 'primitive',
        ...base(raw),
      };
      return;
    }

    if (Array.isArray(schema.type)) {
      const out: SchemaData = {
        type: 'or',
        items: [],
        ...base(raw),
      };
      refs[id] = out;

      for (const type of schema.type) {
        const key = `${id}_type:${type}`;
        scanRefs(key, {
          ...schema,
          type,
        });
        out.items.push({
          name: type,
          $type: key,
        });
      }
      return;
    }

    if (schema.oneOf && schema.anyOf) {
      const out: SchemaData = {
        type: 'and',
        items: [],
        ...base(raw),
      };
      refs[id] = out;
      for (const omit of ['anyOf', 'oneOf'] as const) {
        const $type = `${id}_omit:${omit}`;
        scanRefs($type, { ...schema, [omit]: undefined });

        out.items.push({
          name: refs[$type].aliasName,
          $type,
        });
      }
      return;
    }

    // display both `oneOf` & `anyOf` as OR for simplified overview
    const union = schema.oneOf ?? schema.anyOf;
    if (union) {
      const out: SchemaData = {
        type: 'or',
        items: [],
        ...base(raw),
      };
      refs[id] = out;

      for (const rawItem of union) {
        if (!rawItem || typeof rawItem !== 'object' || !isVisible(rawItem)) continue;
        const itemId = getSchemaId(rawItem);
        const item = dereference(rawItem);
        if (typeof item !== 'object') continue;
        const key = `${id}_extends:${itemId}`;

        scanRefs(key, {
          ...schema,
          oneOf: undefined,
          anyOf: undefined,
          ...item,
          properties: {
            ...schema.properties,
            ...item.properties,
          },
        });
        out.items.push({
          $type: key,
          name: refs[itemId]?.aliasName ?? stringify(rawItem, { alias: true }),
        });
      }
      return;
    }

    if (schema.allOf) {
      scanRefs(id, mergeAllOf(schema));
      return;
    }

    if (schema.type === 'object') {
      const out: SchemaData = {
        type: 'object',
        props: [],
        ...base(raw),
      };
      refs[id] = out;

      const { properties = {}, patternProperties, additionalProperties } = schema;
      const props = Object.entries(properties);
      if (patternProperties) props.push(...Object.entries(patternProperties));

      for (const [key, prop] of props) {
        if (!prop || !isVisible(prop)) continue;
        const $type = getSchemaId(prop);
        scanRefs($type, prop);
        out.props.push({
          $type,
          name: key,
          required: schema.required?.includes(key) ?? false,
        });
      }

      if (additionalProperties && isVisible(additionalProperties)) {
        const $type = getSchemaId(additionalProperties);
        scanRefs($type, additionalProperties);

        out.props.push({
          $type,
          name: '[key: string]',
          required: false,
        });
      }
      return;
    }

    if (schema.type === 'array') {
      const items = schema.items ?? true;
      const $type = getSchemaId(items);

      refs[id] = {
        type: 'array',
        item: {
          $type,
        },
        ...base(raw),
      };
      scanRefs($type, items);
      return;
    }

    refs[id] = {
      type: 'primitive',
      ...base(raw),
    };
  }

  const $root = getSchemaId(root);
  scanRefs($root, root);
  return {
    refs,
    $root,
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
