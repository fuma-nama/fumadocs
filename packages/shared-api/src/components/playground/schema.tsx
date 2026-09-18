import { createContext, ReactNode, use, useMemo } from 'react';
import {
  dereference,
  type JsonSchema,
  matches,
  matchesType,
  mergeAllOf,
  sample,
} from '@fumadocs/json-schema';
import { FieldKey, useDataEngine, useFieldValue, useNamespace } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';

interface SchemaContextType extends SchemaScope {
  docRoot: Exclude<JsonSchema, boolean>;
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

export const anyFields = {
  type: ['string', 'number', 'boolean', 'array', 'object'],
  items: true,
  additionalProperties: true,
} satisfies JsonSchema;

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
  schema: Exclude<JsonSchema, boolean>,
  depth = 0,
): {
  info: FieldInfo;
  schema: Exclude<JsonSchema, boolean>;
  updateInfo: (value: Partial<FieldInfo>) => void;
} {
  const engine = useDataEngine();
  const { generateDefault } = useSchemaUtils();
  const fieldData = useNamespace({
    namespace: `field-info:${depth}:${stringifyFieldKey(fieldName)}`,
    initial(): FieldInfo {
      const value = engine.get(fieldName);
      const out: FieldInfo = {
        oneOf: -1,
      };
      const union = getUnion(schema);
      if (union) {
        const [members, field] = union;

        out.oneOf = members.findIndex((item) => typeof item === 'object' && matches(item, value));
        if (out.oneOf === -1) out.oneOf = 0;
        out.unionField = field;
      }

      if (Array.isArray(schema.type)) {
        const types = schema.type;

        out.selectedType = types.find((type) => matchesType(value, type)) ?? types[0];
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

      let valueSchema: JsonSchema = schema;
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
    generateDefault(schema: JsonSchema): unknown {
      return sample(schema as never, {
        skipNonRequired: true,
        skipReadOnly: !readOnly,
        quiet: true,
      });
    },
  };
}

/**
 * dereference & merge `allOf`.
 */
export function useResolvedSchema(raw: JsonSchema): Exclude<JsonSchema, boolean> {
  return useMemo(() => {
    let out = dereference(raw);

    if (typeof out === 'object' && out.allOf) {
      out = mergeAllOf(out);
    }

    return typeof out === 'boolean' ? anyFields : out;
  }, [raw]);
}

function getUnion(
  schema: Exclude<JsonSchema, boolean>,
): [readonly JsonSchema[], UnionField] | undefined {
  if (schema.anyOf) {
    return [schema.anyOf, 'anyOf'];
  }

  if (schema.oneOf) return [schema.oneOf, 'oneOf'];
}
