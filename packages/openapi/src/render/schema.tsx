import { Fragment, type ReactNode } from 'react';
import type { ResolvedSchema } from '@/utils/schema';
import type { RenderContext } from '@/types';
import { combineSchema } from '@/utils/combine-schema';
import { Markdown } from './markdown';
import { schemaToString } from '@/utils/schema-to-string';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'fumadocs-ui/components/tabs';

interface Context {
  stack: SchemaStack;
}

export function Schema({
  name,
  schema,
  required = false,
  readOnly = false,
  writeOnly = false,
  as = 'property',
  ctx: { renderer },
}: {
  name: string;
  required?: boolean;
  schema: ResolvedSchema;
  as?: 'property' | 'body';

  readOnly?: boolean;
  writeOnly?: boolean;
  ctx: RenderContext;
}): ReactNode {
  function propertyBody(
    schema: Exclude<ResolvedSchema, boolean>,
    renderPrimitive: (
      child: Exclude<ResolvedSchema, boolean>,
      ctx: Context,
    ) => ReactNode,
    ctx: Context,
  ) {
    if (Array.isArray(schema.type)) {
      const items = schema.type.flatMap((type) => {
        const composed = {
          ...schema,
          type,
        };
        if (!isComplexType(composed)) return [];
        return composed;
      });
      if (items.length === 0) return;
      if (items.length === 1)
        return propertyBody(items[0], renderPrimitive, ctx);

      return (
        <Tabs defaultValue={items[0].type}>
          <TabsList>
            {items.map((item) => (
              <TabsTrigger key={item.type} value={item.type}>
                {schemaToString(item)}
              </TabsTrigger>
            ))}
          </TabsList>
          {items.map((item) => (
            <TabsContent key={item.type} value={item.type}>
              {item.description && <Markdown text={item.description} />}
              {propertyInfo(item)}
              {renderPrimitive(item, ctx)}
            </TabsContent>
          ))}
        </Tabs>
      );
    }

    if (schema.oneOf) {
      const oneOf = schema.oneOf.filter((item) =>
        isComplexType(item),
      ) as Exclude<ResolvedSchema, boolean>[];
      if (oneOf.length === 0) return;
      if (oneOf.length === 1) {
        return propertyBody(oneOf[0], renderPrimitive, ctx);
      }

      return (
        <Tabs defaultValue="0">
          <TabsList>
            {oneOf.map((item, i) => (
              <TabsTrigger key={i} value={i.toString()}>
                {schemaToString(item)}
              </TabsTrigger>
            ))}
          </TabsList>
          {oneOf.map((item, i) => (
            <TabsContent key={i} value={i.toString()}>
              {item.description && <Markdown text={item.description} />}
              {propertyInfo(item)}
              {propertyBody(
                item,
                (child, ctx) => primitiveBody(child, ctx, false, true),
                ctx,
              )}
            </TabsContent>
          ))}
        </Tabs>
      );
    }

    const of = schema.allOf ?? schema.anyOf;
    if (of) {
      const arr = of.filter((item) => !ctx.stack.has(item));
      if (arr.length === 0) return;
      const combined = combineSchema(arr);
      if (typeof combined === 'boolean') return;

      return renderPrimitive(combined, ctx);
    }

    return renderPrimitive(schema, ctx);
  }

  function propertyInfo(schema: Exclude<ResolvedSchema, boolean>) {
    const fields: {
      key: string;
      value: string;
    }[] = [];

    if (schema.default !== undefined) {
      fields.push({
        key: 'Default',
        value: JSON.stringify(schema.default),
      });
    }

    if (schema.pattern) {
      fields.push({
        key: 'Match',
        value: schema.pattern,
      });
    }

    if (schema.format) {
      fields.push({
        key: 'Format',
        value: schema.format,
      });
    }

    if (schema.multipleOf) {
      fields.push({
        key: 'Multiple Of',
        value: String(schema.multipleOf),
      });
    }

    let range = getRange(
      'value',
      schema.minimum,
      schema.exclusiveMinimum,
      schema.maximum,
      schema.exclusiveMaximum,
    );
    if (range)
      fields.push({
        key: 'Range',
        value: range,
      });

    range = getRange(
      'length',
      schema.minLength,
      undefined,
      schema.maxLength,
      undefined,
    );
    if (range)
      fields.push({
        key: 'Length',
        value: range,
      });

    range = getRange(
      'properties',
      schema.minProperties,
      undefined,
      schema.maxProperties,
      undefined,
    );
    if (range)
      fields.push({
        key: 'Properties',
        value: range,
      });

    if (schema.enum) {
      fields.push({
        key: 'Value in',
        value: schema.enum.map((value) => JSON.stringify(value)).join(' | '),
      });
    }

    if (fields.length === 0) return;
    return (
      <div className="flex flex-wrap gap-2 not-prose">
        {fields.map((field) => (
          <div
            key={field.key}
            className="bg-fd-secondary border rounded-lg text-xs p-1.5 shadow-md"
          >
            <span className="font-medium me-2">{field.key}</span>
            <code className="text-fd-muted-foreground">{field.value}</code>
          </div>
        ))}
      </div>
    );
  }

  function primitiveBody(
    schema: Exclude<ResolvedSchema, boolean>,
    ctx: Context,
    collapsible: boolean,
    nested: boolean,
  ) {
    if (schema.type === 'object') {
      if (ctx.stack.has(schema)) return <p>Recursive</p>;
      const props = Object.entries(schema.properties ?? {});
      const patternProps = Object.entries(schema.patternProperties ?? {});
      const next = {
        ...ctx,
        stack: ctx.stack.next(schema),
      };

      if (props.length === 0 && patternProps.length === 0)
        return <p>Empty Object</p>;

      const children = (
        <>
          {props.map(([key, value]) => (
            <Fragment key={key}>
              {property(key, value, next, {
                required: schema.required?.includes(key) ?? false,
                nested,
              })}
            </Fragment>
          ))}
          {patternProps.map(([key, value]) => (
            <Fragment key={key}>
              {property(key, value, next, { nested })}
            </Fragment>
          ))}
          {schema.additionalProperties &&
            property('[key: string]', schema.additionalProperties, next, {
              nested,
            })}
        </>
      );

      if (!collapsible) return children;

      return (
        <renderer.ObjectCollapsible name="Show Attributes">
          {children}
        </renderer.ObjectCollapsible>
      );
    }

    if (schema.type === 'array') {
      const items = schema.items;
      if (!items || typeof items === 'boolean' || ctx.stack.has(items)) return;

      return (
        <renderer.ObjectCollapsible name="Array Item">
          <div className="text-sm border-t p-3 border-x prose-no-margin bg-fd-card last:rounded-b-xl first:rounded-tr-xl last:border-b empty:hidden">
            <Markdown text={items.description ?? 'No Description'} />
            {propertyInfo(items)}
          </div>
          {propertyBody(
            items,
            (child, ctx) => primitiveBody(child, ctx, false, true),
            {
              ...ctx,
              stack: ctx.stack.next(schema),
            },
          )}
        </renderer.ObjectCollapsible>
      );
    }
  }

  function property(
    key: string,
    schema: ResolvedSchema,
    ctx: Context,
    props?: {
      required?: boolean;
      nested?: boolean;
    },
  ) {
    if (schema === true) {
      return <renderer.Property name={key} type="any" {...props} />;
    } else if (schema === false) {
      return <renderer.Property name={key} type="never" {...props} />;
    }

    if ((schema.readOnly && !readOnly) || (schema.writeOnly && !writeOnly))
      return;

    return (
      <renderer.Property
        name={key}
        type={schemaToString(schema)}
        deprecated={schema.deprecated}
        {...props}
      >
        {schema.description && <Markdown text={schema.description} />}
        {propertyInfo(schema)}
        {propertyBody(
          schema,
          (child, ctx) => primitiveBody(child, ctx, true, true),
          ctx,
        )}
      </renderer.Property>
    );
  }

  const context: Context = {
    stack: schemaStack(),
  };
  if (
    typeof schema === 'boolean' ||
    as === 'property' ||
    !isComplexType(schema)
  )
    return property(name, schema, context, { required });
  return propertyBody(
    schema,
    (child, ctx) => primitiveBody(child, ctx, false, false),
    context,
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
function isComplexType(
  schema: ResolvedSchema,
): schema is Exclude<ResolvedSchema, boolean> {
  if (typeof schema === 'boolean') return false;
  const arr = schema.anyOf ?? schema.oneOf ?? schema.allOf;
  if (arr && arr.some(isComplexType)) return true;

  return (
    schema.type === 'object' ||
    (schema.type === 'array' && schema.items != null)
  );
}

function getRange(
  value: string,
  min: number | undefined,
  exclusiveMin: number | undefined,
  max: number | undefined,
  exclusiveMax: number | undefined,
) {
  const out = [];
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
