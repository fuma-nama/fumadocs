import { Ajv2020 } from 'ajv/dist/2020';
import type { RequestSchema } from '@/playground/index';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { getDefaultValue } from '@/playground/get-default-values';
import type { ParsedSchema } from '@/utils/schema';

interface SchemaContextType {
  references: Record<string, RequestSchema>;
  fieldInfoMap: Map<string, FieldInfo>;
  ajv: Ajv2020;
}

type UnionField = 'anyOf' | 'allOf' | 'oneOf';

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
  const value = form.getValues(fieldName as 'body');
  const [info, setInfo] = useState<FieldInfo>(() => {
    return fieldInfoMap.get(keyName) ?? init();
  });

  fieldInfoMap.set(keyName, info);

  /**
   * We automatically merge `allOf` | `anyOf` if all members are objects, but it's also possible for them to behave same as a union (`oneOf`).
   */
  function isUnion(anyOrAllOf: readonly ParsedSchema[]): boolean {
    return anyOrAllOf.every((item) => {
      if (typeof item === 'boolean') return true;

      const u = item.anyOf || item.allOf;
      return item.type !== 'object' && (!u || isUnion(u));
    });
  }

  function getUnion(): [readonly ParsedSchema[], UnionField] | undefined {
    if (schema.anyOf && isUnion(schema.anyOf)) {
      return [schema.anyOf, 'anyOf'];
    }

    if (schema.allOf && isUnion(schema.allOf)) {
      return [schema.allOf, 'allOf'];
    }

    if (schema.oneOf) return [schema.oneOf, 'oneOf'];
  }

  function init(): FieldInfo {
    const union = getUnion();
    if (union) {
      const [members, field] = union;

      let oneOf = members.findIndex((item) => ajv.validate(item, value));
      if (oneOf === -1) oneOf = 0;

      return {
        oneOf,
        unionField: field,
      };
    }

    if (Array.isArray(schema.type)) {
      const types = schema.type;

      return {
        selectedType:
          types.find((type) => {
            schema.type = type;
            const match = ajv.validate(schema, value);
            schema.type = types;

            return match;
          }) ?? types[0],
        oneOf: -1,
      };
    }

    return { oneOf: -1 };
  }

  return {
    info,
    updateInfo: useEffectEvent((value) => {
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
    }),
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
