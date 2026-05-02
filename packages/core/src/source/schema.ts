import { z } from 'zod';

/**
 * Zod 4 schema
 */
export const metaSchema = z.object({
  title: z.string().optional(),
  pages: z.array(z.string()).optional(),
  description: z.string().optional(),
  root: z.boolean().optional(),
  defaultOpen: z.boolean().optional(),
  collapsible: z.boolean().optional(),
  icon: z.string().optional(),
});

export type _JSONType =
  | number
  | boolean
  | string
  | null
  | _JSONType[]
  | {
      [key: string]: _JSONType;
    };
/**
 * Zod 4 schema
 */
export const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  full: z.boolean().optional(),

  // Fumadocs OpenAPI generated
  _openapi: z.record(z.string(), z.custom<_JSONType>()).optional(),
});
