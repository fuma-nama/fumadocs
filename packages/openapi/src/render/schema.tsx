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
  stack?: SchemaStack;

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
    stack = schemaStack(),
  } = ctx;

  if (schema === true) {
    return <renderer.Property name={name} type="any" />;
  } else if (schema === false) {
    return <renderer.Property name={name} type="never" />;
  }

  if (
    (schema.readOnly && !ctx.readOnly) ||
    (schema.writeOnly && !ctx.writeOnly)
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
          stack: stack.next(schema),
        }}
      />
    );
  }

  if (schema.allOf || schema.anyOf) {
    const arr = ((schema.allOf ?? schema.anyOf) as ParsedSchema[]).filter(
      (item) => !stack.has(item),
    );
    if (arr.length === 0) return;

    return (
      <Schema
        name={name}
        parseObject={parseObject}
        required={required}
        schema={combineSchema(arr)}
        ctx={{
          ...ctx,
          stack: stack.next(schema),
        }}
      />
    );
  }

  // object type
  if (schema.type === 'object' && parseObject) {
    const {
      additionalProperties,
      patternProperties = {},
      properties = {},
    } = schema;

    return (
      <div className="flex flex-col gap-4">
        {Object.entries(properties).map(([key, value]) => {
          return (
            <Schema
              key={key}
              name={key}
              schema={value}
              parseObject={false}
              required={schema.required?.includes(key) ?? false}
              ctx={{
                ...ctx,
                stack: stack.next(schema),
              }}
            />
          );
        })}
        {Object.entries(patternProperties).map(([key, value]) => {
          return (
            <Schema
              key={key}
              name={key}
              schema={value}
              parseObject={false}
              ctx={{
                ...ctx,
                stack: stack.next(schema),
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
              stack: stack.next(schema),
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

  if (schema.type === 'object' && !parseObject) {
    if (!stack.has(schema))
      footer = (
        <renderer.ObjectCollapsible name="Show Attributes">
          <Schema name={name} schema={schema} ctx={ctx} />
        </renderer.ObjectCollapsible>
      );
  } else {
    let mentionedSchemas: ParsedSchema[] = [];
    if (Array.isArray(schema.type)) {
      mentionedSchemas.push(
        ...schema.type.map((type) => ({
          ...schema,
          type,
        })),
      );
    }

    if (schema.oneOf) mentionedSchemas.push(...schema.oneOf);
    if (schema.not) mentionedSchemas.push(schema.not);
    if (schema.type === 'array' && schema.items)
      mentionedSchemas.push(schema.items);

    mentionedSchemas = mentionedSchemas.filter(
      (s) => isComplexType(s) && !stack.has(s),
    );

    if (mentionedSchemas.length > 0) {
      footer = (
        <div className="flex flex-col gap-2">
          {mentionedSchemas.map((s, idx) => {
            let title = typeof s === 'object' ? s.title : null;
            title ??=
              mentionedSchemas.length === 1
                ? 'Show Attributes'
                : `Object ${idx + 1}`;

            return (
              <renderer.ObjectCollapsible key={idx} name={title}>
                <Schema
                  name="element"
                  schema={s}
                  ctx={{
                    ...ctx,
                    stack: stack.next(schema),
                  }}
                />
              </renderer.ObjectCollapsible>
            );
          })}
        </div>
      );
    }
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

interface SchemaStack {
  next(...schema: ResolvedSchema[]): SchemaStack;
  add(schema: ResolvedSchema): void;
  has(schema: ResolvedSchema): boolean;
}

function schemaStack(parent?: SchemaStack): SchemaStack {
  const titles = new Set<string>();
  const history = new WeakSet();

  return {
    next(...schemas) {
      const child = schemaStack(this);
      for (const item of schemas) {
        child.add(item);
      }
      return child;
    },
    add(schema) {
      if (typeof schema !== 'object') return;

      if (schema.title) titles.add(schema.title);
      history.add(schema);
    },
    has(schema) {
      if (typeof schema !== 'object') return false;
      if (parent && parent.has(schema)) return true;
      if (schema.title && titles.has(schema.title)) return true;

      return history.has(schema);
    },
  };
}

/**
 * Check if the schema needs another collapsible to explain
 */
function isComplexType(schema: ResolvedSchema): boolean {
  if (typeof schema === 'boolean') return false;
  const arr = schema.anyOf ?? schema.oneOf ?? schema.allOf;
  if (arr && arr.some(isComplexType)) return true;

  return (
    schema.type === 'object' ||
    (schema.type === 'array' &&
      schema.items != null &&
      isComplexType(schema.items))
  );
}
