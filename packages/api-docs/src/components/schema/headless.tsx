'use client';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fromTranslations } from '@fuma-translate/react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { useAnchorId } from '@/auto-anchor/client';
import type { ParsedSchema } from '@/schema';
import { FormatFlags, schemaToString } from '@/schema/to-string';
import { mergeAllOf } from '@/schema/merge';
import { dereferenceShallow } from '@/schema/dereference';

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
  root: ParsedSchema;
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

  function generateInfoTags(schema: Exclude<ParsedSchema, boolean>) {
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
  const autoIds = new WeakMap<Exclude<ParsedSchema, boolean>, string>();
  function getSchemaId(schema: ParsedSchema): string {
    if (typeof schema === 'boolean') return String(schema);
    const rawRef = typeof schema.$ref === 'string' ? schema.$ref : undefined;
    if (rawRef) return rawRef;

    const prev = autoIds.get(schema);
    if (prev) return prev;

    const generated = `__${_counter++}`;
    autoIds.set(schema, generated);
    return generated;
  }

  function isVisible(raw: ParsedSchema): boolean {
    const schema = dereferenceShallow(raw);
    if (typeof schema === 'boolean') return true;
    if (schema.writeOnly) return writeOnly;
    if (schema.readOnly) return readOnly;
    return true;
  }

  function base(raw: ParsedSchema): FieldBase {
    const schema = dereferenceShallow(raw);
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
      typeName: schemaToString(raw),
      aliasName: schemaToString(raw, FormatFlags.UseAlias),
      deprecated: schema.deprecated,
    };
  }

  function scanRefs(id: string, raw: ParsedSchema) {
    if (id in refs) return;
    const schema = dereferenceShallow(raw);
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
        const item = dereferenceShallow(rawItem);
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
          name: refs[itemId]?.aliasName ?? schemaToString(rawItem, FormatFlags.UseAlias),
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

export interface SchemaPathItem {
  name: string;
  $ref: string;
}

interface PathItemState extends SchemaPathItem {
  /** property name of highlighted field, only applicable for objects */
  highlighted?: string;
  tabValues?: string[];
  /** popover state, only applicable for root */
  closed?: boolean;
}

export interface SchemaUIContextType {
  rootId: string;
  /** the opened schemas, the first item is always the root */
  path: SchemaPathItem[];
  /** open the schema `$ref` of a property */
  open: (name: string, $ref: string) => void;
  /** go back to the path item at `index` */
  back: (index: number) => void;
  generated: SchemaUIGeneratedData;
}

interface SchemaUIState extends SchemaUIContextType {
  path: PathItemState[];
  setPath: (path: PathItemState[]) => void;
}

const SchemaUIContext = createContext<SchemaUIState | null>(null);
/** roots that already restored their path from the URL */
const restored = new Set<string>();

export function SchemaUIProvider({
  name,
  generated,
  children,
}: {
  name: string;
  generated: SchemaUIGeneratedData;
  children: ReactNode;
}) {
  const rootId = useAnchorId([name]);
  const [path, setPath] = useState<PathItemState[]>(() => [{ $ref: generated.$root, name }]);

  useEffect(() => {
    if (restored.has(rootId)) return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get('path');
    if (url.hash !== `#${rootId}` || !param) return;

    const decoded = decodePath(param, url.searchParams.get('s-highlight'));
    if (decoded.length === 0 || decoded.some((item) => !generated.refs[item.$ref])) return;

    setPath(decoded);
    // avoid re-triggering it again
    restored.add(rootId);
    if (!decoded.at(-1)!.highlighted) {
      document.getElementById(rootId)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rootId, generated.refs]);

  return (
    <SchemaUIContext
      value={useMemo(
        () => ({
          rootId,
          path,
          setPath,
          generated,
          open: (name, $ref) => setPath([...path, { name, $ref }]),
          back: (index) => setPath(path.slice(0, index + 1)),
        }),
        [rootId, path, generated],
      )}
    >
      {children}
    </SchemaUIContext>
  );
}

function usePathState(): SchemaUIState {
  const ctx = use(SchemaUIContext);
  if (!ctx) throw new Error('Component must be used under <SchemaUIProvider />');

  return ctx;
}

export function useSchemaUI(): SchemaUIContextType {
  return usePathState();
}

/**
 * The selected member of a union schema on the path item at `pathIndex`, `depth` for nested unions.
 */
export function useSchemaTabs(
  pathIndex: number,
  depth: number,
): [value: string | undefined, setValue: (value: string) => void] {
  const { path, setPath } = usePathState();

  return [
    // empty for unselected parents restored from the URL
    path[pathIndex].tabValues?.[depth] || undefined,
    (value) => {
      // selections of nested unions belong to the previous value
      const tabValues = path[pathIndex].tabValues?.slice(0, depth) ?? [];
      tabValues[depth] = value;
      setPath(path.with(pathIndex, { ...path[pathIndex], tabValues }));
    },
  ];
}

/**
 * Open state of the popover showing the schema `$ref` of the root property `pathName`.
 */
export function useSchemaPopover(
  pathName: string,
  $ref: string,
): { open: boolean; onOpenChange: (open: boolean) => void } {
  const { path, setPath } = usePathState();

  return {
    open: path.length > 1 && path[1].$ref === $ref && path[1].name === pathName && !path[0].closed,
    onOpenChange(open) {
      if (open) {
        setPath([
          { ...path[0], closed: false },
          { name: pathName, $ref },
        ]);
      } else {
        setPath(path.map((item, i) => (i === 0 ? { ...item, closed: true } : item)));
      }
    },
  };
}

/**
 * Whether the property `name` on the path item at `pathIndex` is highlighted by the link it was opened from.
 *
 * @returns the state and a ref to scroll the highlighted element into view
 */
export function useSchemaHighlight(
  pathIndex: number,
  name: string,
): [highlighted: boolean, ref: (element: HTMLElement | null) => void] {
  const { path } = usePathState();
  const item = path[pathIndex];
  const highlighted = item.highlighted === name;
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !highlighted) return;

      window.setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        delete item.highlighted;
      }, 300);
    },
    [item, highlighted],
  );

  return [highlighted, ref];
}

/**
 * Copy the link to the property `name` of the current path.
 */
export function useCopySchemaLink(name: string) {
  const { path, rootId } = usePathState();

  return useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = `#${rootId}`;
    url.searchParams.set('s-highlight', name);
    url.searchParams.set('path', encodePath(path));
    return navigator.clipboard.writeText(url.href);
  });
}

function encodePath(path: PathItemState[]): string {
  return path.map((item) => [item.name, item.$ref, ...(item.tabValues ?? [])].join('\0')).join('|');
}

function decodePath(path: string, highlighted: string | null): PathItemState[] {
  const out: PathItemState[] = [];
  for (const part of path.split('|')) {
    const [name, $ref, ...tabValues] = part.split('\0');
    out.push({ name, $ref, tabValues });
  }

  if (highlighted && out.length > 0) out[out.length - 1].highlighted = highlighted;
  return out;
}
