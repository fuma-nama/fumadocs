'use client';
import { useMemo, type ReactNode } from 'react';
import type { ParsedSchema, SchemaResolver } from '@/schema';
import { FormatFlags, schemaToString } from '@/schema/to-string';
import { mergeAllOf } from '@/schema/merge';
import { SchemaUI, type SchemaUIProps } from '@/components/schema/client';
import { fromTranslations, useTranslations } from '@fuma-translate/react';

export interface FieldBase {
  description?: ReactNode;
  infoTags?: InfoTag[];

  typeName: string;
  aliasName: string;

  deprecated?: boolean;
}

export interface InfoTag {
  label: ReactNode;
  value: string;
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

export interface SchemaUIOptions {
  root: ParsedSchema;
  client: Omit<SchemaUIProps, 'generated'>;
  resolver: SchemaResolver;
  renderMarkdown: (md: string) => ReactNode;

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
}

export interface SchemaUIGeneratedData {
  $root: string;
  refs: Record<string, SchemaData>;
}

export function Schema({
  client,
  root,
  readOnly,
  writeOnly,
  resolver,
  showExample,
  renderMarkdown,
}: SchemaUIOptions) {
  const translations = useTranslations().translations;
  const generated = useMemo(() => {
    return generateSchemaUI({
      root,
      resolver,
      readOnly,
      writeOnly,
      showExample,
      renderMarkdown,
      translations,
    });
  }, [root, readOnly, writeOnly, resolver, showExample, renderMarkdown, translations]);

  return <SchemaUI {...client} generated={generated} />;
}

export function generateSchemaUI({
  root,
  resolver,
  renderMarkdown,
  readOnly = false,
  writeOnly = false,
  showExample = false,
  translations = {},
}: Omit<SchemaUIOptions, 'client'> & {
  translations?: Partial<Record<string, string>>;
}): SchemaUIGeneratedData {
  const t = fromTranslations(translations, { note: 'schema UI' });
  const refs: Record<string, SchemaData> = {};

  function generateInfoTags(schema: Exclude<ParsedSchema, boolean>) {
    const fields: InfoTag[] = [];

    if (schema.default !== undefined) {
      fields.push({
        label: t('Default'),
        value: JSON.stringify(schema.default),
      });
    }

    if (schema.pattern) {
      fields.push({
        label: t('Match'),
        value: schema.pattern,
      });
    }

    if (schema.format) {
      fields.push({
        label: t('Format'),
        value: schema.format,
      });
    }

    if (schema.multipleOf) {
      fields.push({
        label: t('Multiple Of'),
        value: schema.multipleOf.toString(),
      });
    }

    let range = formatRange(
      'value',
      schema.minimum,
      schema.exclusiveMinimum,
      schema.maximum,
      schema.exclusiveMaximum,
    );
    if (range) {
      fields.push({
        label: t('Range'),
        value: range,
      });
    }

    range = formatRange('length', schema.minLength, undefined, schema.maxLength, undefined);
    if (range) {
      fields.push({
        label: t('Length'),
        value: range,
      });
    }

    range = formatRange(
      'properties',
      schema.minProperties,
      undefined,
      schema.maxProperties,
      undefined,
    );
    if (range) {
      fields.push({
        label: t('Properties'),
        value: range,
      });
    }

    range = formatRange('items', schema.minItems, undefined, schema.maxItems, undefined);
    if (range) {
      fields.push({
        label: t('Items'),
        value: range,
      });
    }

    if (schema.enum) {
      fields.push({
        label: t('Value in'),
        value: schema.enum.map((value) => JSON.stringify(value)).join(' | '),
      });
    }

    if (showExample && schema.examples) {
      for (const example of schema.examples) {
        fields.push({
          label: t('Example'),
          value: JSON.stringify(example, null, 2),
        });
      }
    }

    return fields;
  }

  let _counter = 0;
  const autoIds = new WeakMap<Exclude<ParsedSchema, boolean>, string>();
  function getSchemaId(schema: ParsedSchema): string {
    if (typeof schema === 'boolean') return String(schema);
    const rawRef = resolver(schema).$ref;
    if (rawRef) return rawRef;

    const prev = autoIds.get(schema);
    if (prev) return prev;

    const generated = `__${_counter++}`;
    autoIds.set(schema, generated);
    return generated;
  }

  function isVisible(schema: ParsedSchema): boolean {
    if (typeof schema === 'boolean') return true;
    if (schema.writeOnly) return writeOnly;
    if (schema.readOnly) return readOnly;
    return true;
  }

  function base(schema: ParsedSchema): FieldBase {
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
      typeName: schemaToString(schema, resolver),
      aliasName: schemaToString(schema, resolver, FormatFlags.UseAlias),
      deprecated: schema.deprecated,
    };
  }

  function scanRefs(id: string, schema: ParsedSchema) {
    if (id in refs) return;
    if (typeof schema === 'boolean') {
      refs[id] = {
        type: 'primitive',
        ...base(schema),
      };
      return;
    }

    if (Array.isArray(schema.type)) {
      const out: SchemaData = {
        type: 'or',
        items: [],
        ...base(schema),
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
        ...base(schema),
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
        ...base(schema),
      };
      refs[id] = out;

      for (const item of union) {
        if (!item || typeof item !== 'object' || !isVisible(item)) continue;
        const itemId = getSchemaId(item);
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
          name: refs[itemId]?.aliasName ?? schemaToString(item, resolver, FormatFlags.UseAlias),
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
        ...base(schema),
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
        ...base(schema),
      };
      scanRefs($type, items);
      return;
    }

    refs[id] = {
      type: 'primitive',
      ...base(schema),
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
