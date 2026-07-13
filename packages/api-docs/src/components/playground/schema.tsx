import { validate, type Schema } from '@cfworker/json-schema';
import { createContext, ReactNode, use, useMemo } from 'react';
import type { ParsedSchema } from '@/schema';
import { mergeAllOf } from '@/schema/merge';
import { FieldKey, useDataEngine, useFieldValue, useNamespace } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { sample } from '@/schema/sample';
import { FormatFlags, schemaToString } from '@/schema/to-string';
import { dereferenceShallow } from '@/schema/dereference';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { isPlainObject } from '@/utils/is-plain-object';

interface SchemaContextType extends SchemaScope {
  docRoot: Exclude<ParsedSchema, boolean>;
}

function matchesSchema(schema: object, value: unknown): boolean {
  if (value === undefined) return false;
  return validate(value, schema as Schema, '2020-12').valid;
}

export interface SchemaScope {
  /**
   * show write only fields
   */
  writeOnly: boolean;

  /**
   * show read only fields
   */
  readOnly: boolean;
}

type UnionField = 'anyOf' | 'oneOf';

export interface FieldInfo {
  selectedType?: string;
  oneOf: number;

  /**
   * The actual field that represents union members.
   */
  unionField?: UnionField;
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

/**
 * Deeply unwrap magic proxies (`@scalar/json-magic`) into raw values.
 *
 * Merged outputs of `dereferenceShallow` are plain objects mixing proxy children at any depth,
 * `getRaw` alone only unwraps proxies themselves.
 */
function toRawSchema(value: unknown): unknown {
  const raw = getRaw(value);
  // raw values never contain proxies, no need to go deeper
  if (raw !== value) return raw;

  if (Array.isArray(value)) return value.map(toRawSchema);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key in value) out[key] = toRawSchema(value[key]);
    return out;
  }

  return value;
}

export const anyFields = {
  type: ['string', 'number', 'boolean', 'array', 'object'],
  items: true,
  additionalProperties: true,
} satisfies ParsedSchema;

export function SchemaProvider({
  readOnly,
  writeOnly,
  docRoot,
  children,
}: SchemaContextType & { children: ReactNode }) {
  return (
    <SchemaContext.Provider
      value={useMemo(() => ({ readOnly, writeOnly, docRoot }), [docRoot, readOnly, writeOnly])}
    >
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchemaContext() {
  return use(SchemaContext)!;
}

/**
 * A hook to store dynamic info of a field, such as selected schema of `oneOf`.
 *
 * @param fieldName - field name of form.
 * @param schema - The **resolved** JSON Schema to generate initial values.
 * @param depth - The depth to avoid duplicated field name with same schema (e.g. nested `oneOf`).
 */
export function useFieldInfo(
  fieldName: FieldKey,
  schema: Exclude<ParsedSchema, boolean>,
  depth = 0,
): {
  info: FieldInfo;
  schema: Exclude<ParsedSchema, boolean>;
  updateInfo: (value: Partial<FieldInfo>) => void;
} {
  const { docRoot: doc } = useSchemaContext();
  const engine = useDataEngine();
  const { generateDefault } = useSchemaUtils();
  const fieldData = useNamespace({
    namespace: `field-info:${depth}:${stringifyFieldKey(fieldName)}`,
    initial(): FieldInfo {
      const value = engine.get(fieldName);
      const out: FieldInfo = {
        oneOf: -1,
      };
      // Validators walk every property (including the virtual `$ref-value` of magic proxies,
      // which recurses infinitely on circular refs), always give them raw schemas.
      const rawDoc = getRaw(doc);
      const union = getUnion(schema);
      if (union) {
        const [members, field] = union;

        out.oneOf = members.findIndex(
          (item) =>
            typeof item === 'object' &&
            matchesSchema({ ...rawDoc, ...(toRawSchema(item) as object) }, value),
        );
        if (out.oneOf === -1) out.oneOf = 0;
        out.unionField = field;
      }

      if (Array.isArray(schema.type)) {
        const types = schema.type;

        out.selectedType =
          types.find((type) => {
            return matchesSchema({ ...rawDoc, ...(toRawSchema(schema) as object), type }, value);
          }) ?? types[0];
      }

      return out;
    },
  });
  const [info, setInfo] = useFieldValue<FieldInfo>([], {
    stf: fieldData,
  });

  return {
    info,
    schema,
    updateInfo(value) {
      const updated = {
        ...info,
        ...value,
      };

      if (updated.oneOf === info.oneOf && updated.selectedType === info.selectedType) return;

      setInfo(updated);

      let valueSchema: ParsedSchema = schema;
      if (updated.unionField) {
        valueSchema = schema[updated.unionField]![updated.oneOf];
      } else if (updated.selectedType) {
        // must remove to `examples` to avoid invalid default values
        valueSchema = {
          ...schema,
          type: updated.selectedType,
          examples: undefined,
        };
      }

      engine.update(fieldName, generateDefault(valueSchema));
    },
  };
}

export function useSchemaUtils() {
  const { readOnly } = useSchemaContext();

  return {
    generateDefault(schema: ParsedSchema): unknown {
      return sample(schema as never, {
        skipNonRequired: true,
        skipReadOnly: !readOnly,
        quiet: true,
      });
    },
    schemaToString(value: ParsedSchema, flags?: FormatFlags) {
      return schemaToString(
        value,
        (raw) => ({
          dereferenced: dereferenceShallow(raw),
          $ref: typeof raw === 'object' && typeof raw.$ref === 'string' ? raw.$ref : undefined,
        }),
        flags,
      );
    },
  };
}

/**
 * dereference & merge `allOf`.
 */
export function useResolvedSchema(raw: ParsedSchema): Exclude<ParsedSchema, boolean> {
  return useMemo(() => {
    let out = dereferenceShallow(raw);

    if (typeof out === 'object' && out.allOf) {
      out = mergeAllOf(out, {
        dereference(schema) {
          return dereferenceShallow(schema);
        },
      });
    }

    return typeof out === 'boolean' ? anyFields : out;
  }, [raw]);
}

function getUnion(
  schema: Exclude<ParsedSchema, boolean>,
): [readonly ParsedSchema[], UnionField] | undefined {
  if (schema.anyOf) {
    return [schema.anyOf, 'anyOf'];
  }

  if (schema.oneOf) return [schema.oneOf, 'oneOf'];
}
