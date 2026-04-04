import { Ajv2020 } from 'ajv/dist/2020';
import { createContext, ReactNode, use, useMemo } from 'react';
import type { ParsedSchema } from '@/utils/schema';
import { mergeAllOf } from '@/utils/schema/merge';
import { FieldKey, useDataEngine, useFieldValue, useNamespace } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { sample } from 'openapi-sampler';
import { FormatFlags, schemaToString } from '@/utils/schema/to-string';
import { dereferenceSwallow } from '@/utils/schema/dereference';
import type { Document } from '@/types';

interface SchemaContextType extends SchemaScope {
  /** (not dereferenced) */
  doc: Document;
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
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);
export const anyFields = {
  type: ['string', 'number', 'boolean', 'array', 'object'],
  items: true,
  additionalProperties: true,
} satisfies ParsedSchema;

export function SchemaProvider({
  doc,
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
      }),
    [],
  );

  return (
    <SchemaContext.Provider
      value={useMemo(() => ({ doc, ajv, readOnly, writeOnly }), [doc, ajv, readOnly, writeOnly])}
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
  const { ajv, doc } = use(SchemaContext)!;
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

        out.oneOf = members.findIndex(
          (item) => typeof item === 'object' && ajv.validate({ ...doc, ...item }, value),
        );
        if (out.oneOf === -1) out.oneOf = 0;
        out.unionField = field;
      }

      if (Array.isArray(schema.type)) {
        const types = schema.type;

        out.selectedType =
          types.find((type) => {
            return ajv.validate({ ...doc, ...schema, type }, value);
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
        valueSchema = { ...schema, type: updated.selectedType, examples: undefined };
      }

      engine.update(fieldName, generateDefault(valueSchema));
    },
  };
}

export function useSchemaUtils() {
  const { doc, readOnly } = use(SchemaContext)!;

  return {
    generateDefault(schema: ParsedSchema): unknown {
      return sample(
        schema as never,
        {
          skipNonRequired: true,
          skipReadOnly: !readOnly,
          quiet: true,
        },
        doc,
      );
    },
    schemaToString(value: ParsedSchema, flags?: FormatFlags) {
      return schemaToString(
        value,
        (raw) => ({
          raw,
          dereferenced: dereferenceSwallow(raw, doc),
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
  const { doc } = use(SchemaContext)!;
  return useMemo(() => {
    let out = dereferenceSwallow(raw, doc);

    if (typeof out === 'object' && out.allOf) {
      out = mergeAllOf(out, {
        dereference(schema) {
          return dereferenceSwallow(schema, doc);
        },
      });
    }

    return typeof out === 'boolean' ? anyFields : out;
  }, [doc, raw]);
}

function getUnion(
  schema: Exclude<ParsedSchema, boolean>,
): [readonly ParsedSchema[], UnionField] | undefined {
  if (schema.anyOf) {
    return [schema.anyOf, 'anyOf'];
  }

  if (schema.oneOf) return [schema.oneOf, 'oneOf'];
}
