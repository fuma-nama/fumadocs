import { z } from 'zod';

const metaSchema = z.object({
  title: z.string().optional(),
  pages: z.array(z.string()).optional(),
  root: z.boolean().optional(),
  icon: z.string().optional(),
});

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export const defaultSchemas = {
  frontmatter: frontmatterSchema,
  meta: metaSchema,
};
