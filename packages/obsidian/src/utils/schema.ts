import { z } from 'zod';

/**
 * Vault notes are often loosely structured, tolerate scalar titles like
 * `title: 2024` instead of rejecting the page.
 */
const looseString = z.preprocess((value) => {
  if (value == null) return undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return value;
}, z.string().optional());

export const frontmatterSchema = z
  .object({
    title: looseString,
    description: z.string().optional(),
    icon: z.string().optional(),
    full: z.boolean().optional(),
    aliases: z.union([z.string().transform((alias) => [alias]), z.array(z.string())]).optional(),
    _openapi: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

export type Frontmatter = z.output<typeof frontmatterSchema>;
