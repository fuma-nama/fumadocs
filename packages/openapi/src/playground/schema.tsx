import { Ajv2020 } from 'ajv/dist/2020';
import type { RequestSchema } from '@/playground/index';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { getDefaultValue } from '@/playground/get-default-values';
import type { ParsedSchema } from '@/utils/schema';
import { mergeAllOf } from '@/utils/merge-schema';

interface SchemaContextType {
  references: Record<string, RequestSchema>;
  fieldInfoMap: Map<string, FieldInfo>;
  ajv: Ajv2020;
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
    merged: Exclude<RequestSchema, boolean>;
  };
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);
export const anyFields = {
  type: ['string', 'number', 'boolean', 'array', 'object'],
  items: true,
  additionalProperties: true,
} satisfies RequestSchema;

export function SchemaProvider({
  references,
  fieldInfoMap,
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
        () => ({ references, fieldInfoMap, ajv }),
        [fieldInfoMap, references, ajv],
      )}
    >
      {children}
    </SchemaContext.Provider>
  );
}

/**
 * A hook to store dynamic info of a field, such as selected schema of `oneOf`.
 *
 * @param fieldName - field name of form.
 * @param schema - The JSON Schema to generate initial values.
 * @param depth - The depth to avoid duplicated field name with same schema (e.g. nested `oneOf`).
 */
export function useFieldInfo(
  fieldName: string,
  schema: Exclude<RequestSchema, boolean>,
  depth: number,
): {
  info: FieldInfo;
  updateInfo: (value: Partial<FieldInfo>) => void;
} {
  const { fieldInfoMap, ajv } = useContext(SchemaContext)!;
  const form = useFormContext();
  const keyName = `${fieldName}:${depth}`;
  const [info, setInfo] = useState<FieldInfo>(() => {
    const value = form.getValues(fieldName as 'body');
    const initialInfo = fieldInfoMap.get(keyName);
    if (initialInfo) return initialInfo;

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
          schema.type = type;
          const match = ajv.validate(schema, value);
          schema.type = types;

          return match;
        }) ?? types.at(0);
    }

    if (schema.allOf) {
      const merged = mergeAllOf(schema);

      if (typeof merged !== 'boolean')
        out.intersection = {
          merged,
        };
    }

    return out;
  });

  fieldInfoMap.set(keyName, info);

  return {
    info,
    updateInfo: (value) => {
      const updated = {
        ...info,
        ...value,
      };

      if (
        updated.oneOf === info.oneOf &&
        updated.selectedType === info.selectedType
      )
        return;

      setInfo(updated);

      let valueSchema: ParsedSchema = schema;
      if (updated.unionField) {
        valueSchema = schema[updated.unionField]![updated.oneOf];
      } else if (updated.selectedType) {
        valueSchema = { ...schema, type: updated.selectedType };
      }

      form.setValue(fieldName, getDefaultValue(valueSchema));
    },
  };
}

/**
 * Resolve `$ref` in the schema, **not recursive**.
 */
export function useResolvedSchema(
  schema: RequestSchema,
): Exclude<RequestSchema, boolean> {
  const { references } = useContext(SchemaContext)!;

  return useMemo(() => {
    if (typeof schema === 'boolean') return anyFields;
    if (schema.$ref) return fallbackAny(references[schema.$ref]);
    return schema;
  }, [references, schema]);
}

export function fallbackAny(
  schema: RequestSchema,
): Exclude<RequestSchema, boolean> {
  return typeof schema === 'boolean' ? anyFields : schema;
}

function getUnion(
  schema: Exclude<RequestSchema, boolean>,
): [readonly ParsedSchema[], UnionField] | undefined {
  if (schema.anyOf) {
    return [schema.anyOf, 'anyOf'];
  }

  if (schema.oneOf) return [schema.oneOf, 'oneOf'];
}
