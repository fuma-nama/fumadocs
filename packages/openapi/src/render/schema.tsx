import { type ReactNode } from 'react';
import type { ParsedSchema, ResolvedSchema } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { combineSchema } from '@/utils/combine-schema';
import { Markdown } from './markdown';
import { schemaToString } from '@/utils/schema-to-string';

const keys: {
  [T in keyof Exclude<ResolvedSchema, boolean>]: string;
} = {
  default: 'Default',
  minimum: 'Minimum',
  maximum: 'Maximum',
  minLength: 'Minimum length',
  maxLength: 'Maximum length',
  pattern: 'Pattern',
  format: 'Format',
};

interface Context {
  readOnly: boolean;
  writeOnly: boolean;
  stack?: ResolvedSchema[];

  render: RenderContext;
}

export function Schema({
  name,
  schema,
  required = false,
  parseObject = true,
  ctx,
}: {
  name: string;
  required?: boolean;
  schema: ResolvedSchema;

  /**
   * Render the full object
   *
   * @defaultValue true
   * */
  parseObject?: boolean;

  ctx: Context;
}): ReactNode {
  const {
    render: { renderer },
    stack = [],
  } = ctx;

  if (schema === true) {
    return <renderer.Property name={name} type="any" />;
  } else if (schema === false) {
    return <renderer.Property name={name} type="never" />;
  }

  if (
    (schema.readOnly === true && !ctx.readOnly) ||
    (schema.writeOnly === true && !ctx.writeOnly)
  )
    return null;

  if (Array.isArray(schema.type) && schema.type.length === 1) {
    return (
      <Schema
        name={name}
        required={required}
        parseObject={parseObject}
        schema={{
          ...schema,
          type: schema.type[0],
        }}
        ctx={{
          ...ctx,
          stack: [schema, ...stack],
        }}
      />
    );
  }

  if (schema.allOf || schema.anyOf) {
    return (
      <Schema
        name={name}
        parseObject={parseObject}
        required={required}
        schema={combineSchema([
          ...(schema.allOf ?? []),
          ...(schema.anyOf ?? []),
        ])}
        ctx={{
          ...ctx,
          stack: [schema, ...stack],
        }}
      />
    );
  }

  // object type
  if (schema.type === 'object' && parseObject) {
    const { additionalProperties, patternProperties, properties } = schema;

    return (
      <div className="flex flex-col gap-4">
        {properties &&
          Object.entries(properties).map(([key, value]) => {
            return (
              <Schema
                key={key}
                name={key}
                schema={value}
                parseObject={false}
                required={schema.required?.includes(key) ?? false}
                ctx={{
                  ...ctx,
                  stack: [schema, ...stack],
                }}
              />
            );
          })}
        {patternProperties &&
          Object.entries(patternProperties).map(([key, value]) => {
            return (
              <Schema
                key={key}
                name={key}
                schema={value}
                parseObject={false}
                ctx={{
                  ...ctx,
                  stack: [schema, ...stack],
                }}
              />
            );
          })}
        {additionalProperties && (
          <Schema
            name="[key: string]"
            schema={additionalProperties}
            parseObject={false}
            ctx={{
              ...ctx,
              stack: [schema, ...stack],
            }}
          />
        )}
      </div>
    );
  }

  let footer: ReactNode;
  const fields: {
    key: string;
    value: string;
  }[] = [];

  for (const [key, value] of Object.entries(keys)) {
    if (key in schema) {
      fields.push({
        key: value,
        value: JSON.stringify(schema[key as keyof ResolvedSchema]),
      });
    }
  }

  if (schema.enum) {
    fields.push({
      key: 'Value in',
      value: schema.enum.map((value) => JSON.stringify(value)).join(' | '),
    });
  }

  if (schema.type === 'object' && !parseObject && !stack.includes(schema)) {
    footer = (
      <renderer.ObjectCollapsible name="Show Attributes">
        <Schema
          name={name}
          schema={schema}
          ctx={{
            ...ctx,
            stack: [schema, ...stack],
          }}
        />
      </renderer.ObjectCollapsible>
    );
  } else {
    let mentionedObjectTypes: ParsedSchema[] = [];
    if (Array.isArray(schema.type)) {
      mentionedObjectTypes.push(
        ...schema.type.map((type) => ({
          ...schema,
          type,
        })),
      );
    }

    if (schema.oneOf) mentionedObjectTypes.push(...schema.oneOf);
    if (schema.not) mentionedObjectTypes.push(schema.not);
    if (schema.type === 'array' && schema.items)
      mentionedObjectTypes.push(schema.items);

    mentionedObjectTypes = mentionedObjectTypes.filter(
      (s) => isComplexType(s) && !stack.includes(s),
    );

    footer = (
      <div className="flex flex-col gap-2">
        {mentionedObjectTypes.map((s, idx) => {
          let title = typeof s === 'object' ? s.title : null;
          title ??=
            mentionedObjectTypes.length === 1
              ? 'Show Attributes'
              : `Object ${idx + 1}`;

          return (
            <renderer.ObjectCollapsible key={idx} name={title}>
              <Schema
                name="element"
                schema={s}
                ctx={{
                  ...ctx,
                  stack: [schema, ...stack],
                }}
              />
            </renderer.ObjectCollapsible>
          );
        })}
      </div>
    );
  }

  return (
    <renderer.Property
      name={name}
      type={schemaToString(schema)}
      required={required}
      deprecated={schema.deprecated}
    >
      {schema.description ? <Markdown text={schema.description} /> : null}
      {fields.length > 0 ? (
        <div className="flex flex-col gap-2">
          {fields.map((field) => (
            <span key={field.key}>
              {field.key}: <code>{field.value}</code>
            </span>
          ))}
        </div>
      ) : null}
      {footer}
    </renderer.Property>
  );
}

/**
 * Check if the schema needs another collapsible to explain
 */
function isComplexType(schema: ResolvedSchema): boolean {
  if (typeof schema === 'boolean') return false;
  if (schema.anyOf ?? schema.oneOf ?? schema.allOf) return true;

  return schema.type === 'object' || schema.type === 'array';
}
