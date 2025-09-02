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
  ctx: renderContext,
}: {
  name: string;
  required?: boolean;
  schema: ResolvedSchema;
  as?: 'property' | 'body';

  readOnly?: boolean;
  writeOnly?: boolean;
  ctx: RenderContext;
}): ReactNode {
  const { renderer } = renderContext;

  function propertyBody(
    schema: Exclude<ResolvedSchema, boolean>,
    renderPrimitive: (
      child: Exclude<ResolvedSchema, boolean>,
      ctx: Context,
    ) => ReactNode,
    ctx: Context,
  ) {
    if (ctx.stack.has(schema)) return;
    const next = {
      ...ctx,
      stack: ctx.stack.next(schema),
    };

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
        return propertyBody(items[0], renderPrimitive, next);

      return (
        <Tabs defaultValue={items[0].type}>
          <TabsList>
            {items.map((item) => (
              <TabsTrigger key={item.type} value={item.type}>
                {schemaToString(item, renderContext.schema)}
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
      if (oneOf.length === 0 || oneOf.some((item) => ctx.stack.has(item)))
        return;
      if (oneOf.length === 1) {
        return propertyBody(oneOf[0], renderPrimitive, next);
      }

      return (
        <Tabs defaultValue="0">
          <TabsList>
            {oneOf.map((item, i) => (
              <TabsTrigger key={i} value={i.toString()}>
                {schemaToString(item, renderContext.schema)}
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
                next,
              )}
            </TabsContent>
          ))}
        </Tabs>
      );
    }

    const of = schema.allOf ?? schema.anyOf;
    if (of) {
      if (of.length === 0) return;
      if (of.some((item) => typeof item === 'object' && ctx.stack.has(item)))
        return;
      const combined = combineSchema(of as ResolvedSchema[]);
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
    if (ctx.stack.has(schema)) return <p>Recursive</p>;

    if (schema.type === 'object') {
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

    if (ctx.stack.has(schema)) return;
    if ((schema.readOnly && !readOnly) || (schema.writeOnly && !writeOnly))
      return;

    return (
      <renderer.Property
        name={key}
        type={schemaToString(schema, renderContext.schema)}
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
    stack: schemaStack(renderContext),
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
  history: ResolvedSchema[];
  next(...schema: ResolvedSchema[]): SchemaStack;
  add(schema: ResolvedSchema): void;
  has(schema: Exclude<ResolvedSchema, boolean>): boolean;
}

function schemaStack(
  renderContext: RenderContext,
  parent?: SchemaStack,
): SchemaStack {
  const ids = new Set<string>();

  function getId(schema: ResolvedSchema) {
    if (typeof schema !== 'object') return;

    return schema.title ?? renderContext.schema.dereferenceMap.get(schema);
  }

  return {
    history: parent ? [...parent.history] : [],
    next(...schemas) {
      const child = schemaStack(renderContext, this);
      for (const item of schemas) {
        child.add(item);
      }
      return child;
    },
    add(schema) {
      if (typeof schema !== 'object') return;

      const id = getId(schema);
      if (id) ids.add(id);
      this.history.push(schema);
    },
    has(schema) {
      if (this.history.length > 30) {
        console.warn(
          `[Fumadocs OpenAPI] schema depth exceeded 30, this might be unexpected.`,
        );
        // stopping at here
        return true;
      }

      if (parent && parent.has(schema)) return true;
      const id = getId(schema);
      if (id) return ids.has(id);

      return this.history.includes(schema);
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
