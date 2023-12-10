import { z } from 'zod';

export const metaSchema = z.object({
  title: z.string().optional(),
  pages: z.array(z.string()),
  icon: z.string().optional(),
});

export const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export type MetaExport = z.infer<typeof metaSchema>;
export type Frontmatter = z.infer<typeof frontmatterSchema>;
