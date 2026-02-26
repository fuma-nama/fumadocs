import { Ajv2020 } from 'ajv/dist/2020';
import { createContext, ReactNode, use, useMemo } from 'react';
import type { ParsedSchema, ResolvedSchema } from '@/utils/schema';
import { mergeAllOf } from '@/utils/merge-schema';
import { FieldKey, useDataEngine, useFieldValue, useNamespace } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { sample } from 'openapi-sampler';
import { FormatFlags, schemaToString } from '@/utils/schema-to-string';

interface SchemaContextType extends SchemaScope {
  references: Record<string, ParsedSchema>;
  ajv: Ajv2020;
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

  intersection?: {
    merged: Exclude<ParsedSchema, boolean>;
  };
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);
export const anyFields = {
  type: ['string', 'number', 'boolean', 'array', 'object'],
  items: true,
  additionalProperties: true,
} satisfies ParsedSchema;

export function SchemaProvider({
  references,
  readOnly,
  writeOnly,
  children,
}: Omit<SchemaContextType, 'ajv'> & { children: ReactNode }) {
  const ajv = useMemo(
    () =>
      new Ajv2020({
        strict: false,
        validateSchema: false,
        validateFormats: false,
        schemas: references,
      }),
    [references],
  );

  return (
    <SchemaContext.Provider
      value={useMemo(
        () => ({ references, ajv, readOnly, writeOnly }),
        [references, ajv, readOnly, writeOnly],
      )}
    >
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchemaScope(): SchemaScope {
  return use(SchemaContext)!;
}

/**
 * A hook to store dynamic info of a field, such as selected schema of `oneOf`.
 *
 * @param fieldName - field name of form.
 * @param schema - The JSON Schema to generate initial values.
 * @param depth - The depth to avoid duplicated field name with same schema (e.g. nested `oneOf`).
 */
export function useFieldInfo(
  fieldName: FieldKey,
  schema: Exclude<ParsedSchema, boolean>,
  depth = 0,
): {
  info: FieldInfo;
  updateInfo: (value: Partial<FieldInfo>) => void;
} {
  const { ajv } = use(SchemaContext)!;
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

        out.oneOf = members.findIndex((item) => ajv.validate(item, value));
        if (out.oneOf === -1) out.oneOf = 0;
        out.unionField = field;
      }

      if (Array.isArray(schema.type)) {
        const types = schema.type;

        out.selectedType =
          types.find((type) => {
            return ajv.validate({ ...schema, type }, value);
          }) ?? types[0];
      }

      if (schema.allOf) {
        const merged = mergeAllOf(schema);

        if (typeof merged !== 'boolean')
          out.intersection = {
            merged,
          };
      }
      return out;
    },
  });
  const [info, setInfo] = useFieldValue<FieldInfo>([], {
    stf: fieldData,
  });

  return {
    info,
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
        valueSchema = { ...schema, type: updated.selectedType };
      }

      engine.update(fieldName, generateDefault(valueSchema));
    },
  };
}

export function useSchemaUtils() {
  const { references } = use(SchemaContext)!;

  function resolve(schema: ParsedSchema): Exclude<ParsedSchema, boolean> {
    if (typeof schema === 'boolean') return anyFields;
    let ref = schema.$ref;
    if (ref) {
      // use swallow resolution as it is already preprocessed in `playground/index.tsx`
      const prefix = '#/';
      if (ref.startsWith(prefix)) ref = ref.slice(prefix.length);
      if (ref in references) return fallbackAny(references[ref]);
    }
    return schema;
  }

  return {
    generateDefault(schema: ParsedSchema): unknown {
      return sample(
        schema as never,
        { skipNonRequired: true, skipReadOnly: true, quiet: true },
        references,
      );
    },
    /**
     * Resolve `$ref` in the schema, **not recursive**.
     */
    resolve,
    schemaToString(value: ResolvedSchema, flags?: FormatFlags) {
      return schemaToString(value, (s) => ({ dereferenced: resolve(s), raw: s }), flags);
    },
  };
}

export function fallbackAny(schema: ParsedSchema): Exclude<ParsedSchema, boolean> {
  return typeof schema === 'boolean' ? anyFields : schema;
}

function getUnion(
  schema: Exclude<ParsedSchema, boolean>,
): [readonly ParsedSchema[], UnionField] | undefined {
  if (schema.anyOf) {
    return [schema.anyOf, 'anyOf'];
  }

  if (schema.oneOf) return [schema.oneOf, 'oneOf'];
}
