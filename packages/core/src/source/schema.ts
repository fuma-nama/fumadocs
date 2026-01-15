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

/**
 * Zod 4 schema
 */
export const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  status: z
    .string()
    .optional()
    .describe(
      'Status badge to display for the page (e.g., "new", "beta", "deprecated", "experimental")',
    ),
  full: z.boolean().optional(),

  // Fumadocs OpenAPI generated
  _openapi: z.looseObject({}).optional(),
});
