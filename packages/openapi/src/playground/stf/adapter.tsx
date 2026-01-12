'use client';
import { Node, SchemaRegistry, useDataEngine, useRender } from '@fumari/stf';
import { primitiveNode, primitivePlugin } from '@fumari/stf/nodes/primitive';
import { unionNode, unionPlugin } from '@fumari/stf/nodes/union';
import { arrayNode, arrayPlugin } from '@fumari/stf/nodes/array';
import { objectNode, objectPlugin } from '@fumari/stf/nodes/object';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import type { ParsedSchema } from '@/utils/schema';
import { Input } from '@/ui/components/input';
import { Plus, Trash2, X } from 'lucide-react';
import { HTMLAttributes, startTransition, useState } from 'react';
import { mergeAllOf } from '@/utils/merge-schema';
import { FormatFlags, schemaToString } from '@/utils/schema-to-string';
import Ajv2020 from 'ajv/dist/2020';

type OpenAPINode<N extends Node> = N & {
  _raw?: Exclude<ParsedSchema, boolean>;
};

interface OpenAPIContext {
  isRequired?: boolean;
  props?: HTMLAttributes<HTMLElement>;
}

interface JSONNode extends Node {
  type: 'json';
  defaultValue?: unknown;
}

const registry = new SchemaRegistry()
  .use(
    primitivePlugin({
      Input({ value, setValue, field, node: _node, ...ctx }) {
        const { isRequired = false, props } = ctx as OpenAPIContext;
        const node = _node as OpenAPINode<typeof _node>;

        if (node.type === 'file') {
          return (
            <div {...props}>
              <label
                htmlFor={field.join('.')}
                className={cn(
                  buttonVariants({
                    color: 'secondary',
                    className: 'w-full h-9 gap-2 truncate',
                  }),
                )}
              >
                {value instanceof File ? (
                  <>
                    <span className="text-fd-muted-foreground text-xs">Selected</span>
                    <span className="truncate w-0 flex-1 text-end">{value.name}</span>
                  </>
                ) : (
                  <span className="text-fd-muted-foreground">Upload</span>
                )}
              </label>
              <input
                id={field.join('.')}
                type="file"
                multiple={false}
                onChange={(e) => {
                  if (!e.target.files) return;
                  setValue(e.target.files.item(0));
                }}
                hidden
              />
            </div>
          );
        }

        if (node.type === 'boolean') {
          return (
            <Select
              value={String(value)}
              onValueChange={(value) =>
                setValue(value === 'undefined' ? undefined : value === 'true')
              }
            >
              <SelectTrigger id={field.join('.')} {...props}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
                {!isRequired && <SelectItem value="undefined">Unset</SelectItem>}
              </SelectContent>
            </Select>
          );
        }

        const isNumber = node.type === 'integer' || node.type === 'decimal';

        return (
          <div {...props} className={cn('flex flex-row gap-2', props?.className)}>
            <Input
              id={field.join('.')}
              placeholder="Enter value"
              type={isNumber ? 'number' : 'text'}
              step={node.type === 'integer' ? 1 : undefined}
              value={(value ?? '') as string}
              onChange={(e) => {
                if (isNumber && !Number.isNaN(e.target.valueAsNumber)) {
                  setValue(e.target.valueAsNumber);
                } else if (!isNumber) {
                  setValue(e.target.value);
                }
              }}
            />
            {value !== undefined && (
              <button
                type="button"
                onClick={() => setValue(undefined)}
                className="text-fd-muted-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        );
      },
    }),
  )
  .use(
    unionPlugin({
      Selector({ setSelectedMember, selectedMember, field, node }) {
        const selected = node.members.find((member) => member.id === selectedMember);
        const render = useRender();
        return (
          <div>
            <select
              className="text-xs font-mono"
              value={selectedMember}
              onChange={(e) => {
                setSelectedMember(e.target.value);
              }}
            >
              {node.members.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  className="bg-fd-popover text-fd-popover-foreground"
                >
                  {item.name}
                </option>
              ))}
            </select>
            {selected && render(field, selected.node)}
          </div>
        );
      },
    }),
  )
  .use(
    arrayPlugin({
      Container({ items, field, ...ctx }) {
        const render = useRender();
        const engine = useDataEngine();
        const { props } = ctx as OpenAPIContext;

        return (
          <div {...props} className={cn('flex flex-col gap-2', props?.className)}>
            {items.map((item, index) => (
              <div key={item.field.join('.')}>
                <span className="text-fd-muted-foreground">
                  {field.at(-1)}[{index}]
                </span>
                <button
                  type="button"
                  aria-label="Remove Item"
                  className={cn(
                    buttonVariants({
                      color: 'outline',
                      size: 'icon-xs',
                    }),
                  )}
                  onClick={() => {
                    const value = engine.get(field);
                    if (Array.isArray(value)) {
                      engine.update(
                        field,
                        value.filter((_, i) => i !== index),
                      );
                    }
                  }}
                >
                  <Trash2 />
                </button>
                {render(item.field, item.node, {
                  isRequired: true,
                } satisfies OpenAPIContext)}
              </div>
            ))}
            <button
              type="button"
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  className: 'gap-1.5 py-2',
                  size: 'sm',
                }),
              )}
              onClick={() => {
                const value = engine.get(field);
                if (Array.isArray(value)) {
                  engine.update(field, [...value, undefined]);
                }
              }}
            >
              <Plus className="size-4" />
              New Item
            </button>
          </div>
        );
      },
    }),
  )
  .use(
    objectPlugin({
      Object({ properties, field, node: _node, ...ctx }) {
        const { props } = ctx as OpenAPIContext;
        const node = _node as OpenAPINode<typeof _node>;
        const [nextName, setNextName] = useState('');
        const engine = useDataEngine();
        const render = useRender();

        const onAppend = () => {
          const name = nextName.trim();
          if (name.length === 0) return;

          startTransition(() => {
            engine.init([...field, name]);
            setNextName('');
          });
        };

        return (
          <div
            {...props}
            className={cn('grid grid-cols-1 gap-4 @md:grid-cols-2', props?.className)}
          >
            {properties.map((prop) => (
              <div key={prop.field.join('.')}>
                {render(prop.field, prop.node, {
                  isRequired: node._raw?.required?.includes(prop.node.key),
                } satisfies OpenAPIContext)}
              </div>
            ))}
            <div className="flex gap-2 col-span-full">
              <Input
                value={nextName}
                placeholder="Enter Property Name"
                onChange={(e) => setNextName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onAppend();
                    e.preventDefault();
                  }
                }}
              />
              <button
                type="button"
                className={cn(buttonVariants({ color: 'secondary', size: 'sm' }), 'px-4')}
                onClick={onAppend}
              >
                New
              </button>
            </div>
          </div>
        );
      },
      Property({ field, node, ...ctx }) {
        const engine = useDataEngine();
        const render = useRender();

        return (
          <div>
            <button
              type="button"
              aria-label="Remove Item"
              className={cn(
                buttonVariants({
                  color: 'outline',
                  size: 'icon-xs',
                }),
              )}
              onClick={() => {
                engine.delete(field);
              }}
            >
              <Trash2 />
            </button>
            {render(field, node, ctx)}
          </div>
        );
      },
    }),
  )
  .use({
    apply(registry) {
      registry.registerNode<JSONNode>('json', {
        Node({ field, node }) {
          const engine = useDataEngine();
          const [error, setError] = useState<string | null>(null);
          const [value, setValue] = useState(() =>
            JSON.stringify(engine.init(field, node.defaultValue), null, 2),
          );

          return (
            <div className="flex flex-col bg-fd-secondary text-fd-secondary-foreground overflow-hidden border rounded-lg">
              <textarea
                value={value}
                className="p-2 h-[240px] text-sm font-mono resize-none focus-visible:outline-none"
                onChange={(v) => {
                  setValue(v.target.value);
                  try {
                    engine.update(field, JSON.parse(v.target.value));
                    setError(null);
                  } catch (e) {
                    if (e instanceof Error) setError(e.message);
                  }
                }}
              />
              <p className="p-2 text-xs font-mono border-t text-red-400 empty:hidden">{error}</p>
            </div>
          );
        },
      });
    },
  });

export const { Form, Field } = registry.toForm();

const anyField = unionNode({
  type: 'union',
  members: [
    {
      id: 'string',
      name: 'string',
      node: primitiveNode({
        type: 'string',
        defaultValue: '',
      }),
    },
    {
      id: 'integer',
      name: 'integer',
      node: primitiveNode({
        type: 'integer',
        defaultValue: 0,
      }),
    },
    {
      id: 'decimal',
      name: 'decimal',
      node: primitiveNode({
        type: 'decimal',
        defaultValue: 0,
      }),
    },
  ],
});

export function createSchema(
  parsed: ParsedSchema,
  ctx: {
    ajv: Ajv2020;
    refs: Record<string, Node>;
  },
): Node {
  const { ajv, refs } = ctx;
  if (typeof parsed === 'boolean') return anyField;
  if (parsed.$ref) {
    if (refs[parsed.$ref]) return refs[parsed.$ref];

    refs[parsed.$ref] = {
      type: 'pending',
    };
    const out = createSchema(ajv.getSchema(parsed.$ref)!.schema, ctx);
    Object.assign(refs[parsed.$ref], out);
    return refs[parsed.$ref];
  }

  if (parsed.allOf) {
    return createSchema(mergeAllOf(parsed), ctx);
  }

  const unionField = parsed.oneOf ?? parsed.anyOf;
  if (unionField) {
    return unionNode({
      type: 'union',
      members: unionField.map((item, i) => ({
        id: String(i),
        name: schemaToString(item, undefined, FormatFlags.UseAlias),
        node: createSchema(item, ctx),
      })),
      match(value) {
        return ajv.validate(parsed, value);
      },
    });
  }

  if (parsed.type === 'object') {
    return objectNode({
      type: 'object',
      properties: Object.entries(parsed.properties ?? {}).map(([k, v]) => ({
        type: 'property',
        key: k,
        name: k,
        children: createSchema(v, ctx),
      })),
      match(value) {
        return ajv.validate(parsed, value);
      },
    });
  }

  if (parsed.type === 'array') {
    return arrayNode({
      type: 'array',
      item: createSchema(parsed, ctx),
      match(value) {
        return ajv.validate(parsed, value);
      },
    });
  }

  if (Array.isArray(parsed.type)) {
    return unionNode({
      type: 'union',
      members: parsed.type.map((type: string) => ({
        id: type,
        name: type,
        node: createSchema({ ...parsed, type }, ctx),
      })),
      match(value) {
        return ajv.validate(parsed, value);
      },
    });
  }

  if (parsed.type === 'string' && parsed.format === 'binary') {
    return primitiveNode({
      type: 'file',
      match(value) {
        return ajv.validate(parsed, value);
      },
    });
  }

  switch (parsed.type) {
    case 'number':
      return primitiveNode({
        type: 'decimal',
        match(value) {
          return ajv.validate(parsed, value);
        },
      });
    case 'string':
    case 'boolean':
    case 'integer':
      return primitiveNode({
        type: parsed.type,
        match(value) {
          return ajv.validate(parsed, value);
        },
      });
  }

  return {
    type: 'null',
  };
}
