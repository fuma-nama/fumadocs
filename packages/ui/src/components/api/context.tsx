import type { ReferenceSchema, RequestSchema } from 'fumadocs-openapi';
import { createContext, type MutableRefObject, useContext } from 'react';

interface SchemaContextType {
  references: Record<string, RequestSchema>;
  dynamic: MutableRefObject<Map<string, DynamicField>>;
}

export type DynamicField =
  | {
      type: 'object';
      properties: string[];
    }
  | {
      type: 'field';
      schema: RequestSchema | ReferenceSchema;
    };

export const SchemaContext = createContext<SchemaContextType | undefined>(
  undefined,
);

export function useSchemaContext(): SchemaContextType {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error('Missing provider');
  return ctx;
}
